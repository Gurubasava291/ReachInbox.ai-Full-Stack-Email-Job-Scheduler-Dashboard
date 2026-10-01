import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, EmailJobData, rescheduleEmailJob } from './emailQueue';
import { redisConnection } from '../config/redis';
import { env } from '../config/env';
import { prisma } from '../config/db';
import { sendMailViaEthereal } from '../services/etherealService';
import { indexEmailInElasticsearch } from '../services/elasticsearchService';
import { sendSlackRateLimitNotification } from '../services/slackService';

function getHourKey(date: Date = new Date()): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}-${hh}`;
}

function getNextHourStartDate(date: Date = new Date()): Date {
  const nextHour = new Date(date);
  nextHour.setUTCHours(nextHour.getUTCHours() + 1, 0, 0, 0);
  return nextHour;
}

export function setupEmailWorker(): Worker<EmailJobData> {
  console.log(`[BullMQ Worker] Initializing worker (Concurrency: ${env.WORKER_CONCURRENCY}, Min Delay: ${env.MIN_EMAIL_DELAY_MS}ms, Max Rate/Hr: ${env.MAX_EMAILS_PER_HOUR_PER_SENDER})`);

  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailJobId, campaignId, senderEmail, recipientEmail, subject, body, userId } = job.data;
      console.log(`[BullMQ Worker Processing] Processing email job ID: ${emailJobId} -> To: ${recipientEmail} (Sender: ${senderEmail})`);

      // 1. Minimum Delay between email sends throttling
      if (env.MIN_EMAIL_DELAY_MS > 0) {
        await new Promise((res) => setTimeout(res, env.MIN_EMAIL_DELAY_MS));
      }

      // 2. Check and Increment Redis Hourly Rate Limiter
      const hourKey = getHourKey();
      const redisRateLimitKey = `ratelimit:${senderEmail}:${hourKey}`;

      const currentCount = await redisConnection.incr(redisRateLimitKey);
      if (currentCount === 1) {
        await redisConnection.expire(redisRateLimitKey, 7200); // Expire after 2 hours
      }

      // Also mirror count to DB RateLimitRecord for persistent audit
      await prisma.rateLimitRecord.upsert({
        where: { senderEmail_hourKey: { senderEmail, hourKey } },
        create: { senderEmail, hourKey, count: currentCount },
        update: { count: currentCount },
      });

      // 3. Handle Hourly Rate Limit Exceeded
      if (currentCount > env.MAX_EMAILS_PER_HOUR_PER_SENDER) {
        const nextHourDate = getNextHourStartDate();
        const delayMsToNextHour = Math.max(1000, nextHourDate.getTime() - Date.now());

        console.warn(`[Rate Limit Exceeded!] Sender '${senderEmail}' reached limit (${currentCount}/${env.MAX_EMAILS_PER_HOUR_PER_SENDER} in window ${hourKey}). Rescheduling job ${emailJobId} to ${nextHourDate.toISOString()}`);

        // Update DB record
        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'RATE_LIMITED_RESCHEDULED',
            scheduledAt: nextHourDate,
            errorReason: `Rate limit of ${env.MAX_EMAILS_PER_HOUR_PER_SENDER}/hr exceeded in window ${hourKey}. Rescheduled to ${nextHourDate.toISOString()}`,
          },
        });

        // Index status change in Elasticsearch
        await indexEmailInElasticsearch({
          id: emailJobId,
          campaignId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'RATE_LIMITED_RESCHEDULED',
          scheduledAt: nextHourDate,
          createdAt: new Date(),
        });

        // Trigger Slack Notification live alert (sent once per sender overflow detection)
        if (currentCount === env.MAX_EMAILS_PER_HOUR_PER_SENDER + 1) {
          sendSlackRateLimitNotification(userId, {
            senderEmail,
            hourKey,
            limit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
            rescheduledCount: 1,
            nextAvailableWindow: nextHourDate.toUTCString(),
          }).catch((err) => console.error(`[Slack Alert Error] ${err.message}`));
        }

        // Reschedule in BullMQ to next hour window
        await rescheduleEmailJob(emailJobId, job.data, delayMsToNextHour);

        return { status: 'rescheduled', nextHourDate: nextHourDate.toISOString() };
      }

      // 4. Update status in DB to SENDING
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: { status: 'SENDING', attempts: { increment: 1 } },
      });

      // 5. Send Email via Ethereal SMTP
      try {
        const sendResult = await sendMailViaEthereal({
          from: senderEmail,
          to: recipientEmail,
          subject: subject,
          html: body,
        });

        const sentTime = new Date();
        const previewUrl = sendResult.previewUrl || undefined;

        // 6. Update DB record to SENT
        const updatedJob = await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'SENT',
            sentAt: sentTime,
            etherealPreviewUrl: previewUrl,
            errorReason: null,
          },
        });

        // 7. Index in Elasticsearch
        await indexEmailInElasticsearch({
          id: emailJobId,
          campaignId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'SENT',
          scheduledAt: updatedJob.scheduledAt,
          sentAt: sentTime,
          etherealPreviewUrl: previewUrl,
          createdAt: updatedJob.createdAt,
        });

        console.log(`[Email Delivered Successfully] ID: ${emailJobId} | Preview: ${previewUrl}`);
        return { status: 'sent', previewUrl };
      } catch (sendError: any) {
        console.error(`[Email Send Error] Job ID ${emailJobId}: ${sendError.message}`);

        await prisma.emailJob.update({
          where: { id: emailJobId },
          data: {
            status: 'FAILED',
            errorReason: sendError.message,
          },
        });

        await indexEmailInElasticsearch({
          id: emailJobId,
          campaignId,
          senderEmail,
          recipientEmail,
          subject,
          body,
          status: 'FAILED',
          scheduledAt: new Date(),
          createdAt: new Date(),
        });

        throw sendError;
      }
    },
    {
      connection: redisConnection,
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[BullMQ Worker Job Failed] Job ID ${job?.id}: ${err.message}`);
  });

  worker.on('completed', (job) => {
    console.log(`[BullMQ Worker Job Completed] Job ID ${job.id}`);
  });

  return worker;
}
