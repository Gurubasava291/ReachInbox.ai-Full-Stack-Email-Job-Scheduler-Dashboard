import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const EMAIL_QUEUE_NAME = 'email-queue';

export interface EmailJobData {
  emailJobId: string;
  campaignId?: string | null;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  userId?: string;
  scheduledAtISO: string;
}

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 86400, count: 5000 },
    removeOnFail: { age: 604800, count: 5000 },
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export async function scheduleEmailJob(data: EmailJobData, delayMs: number): Promise<string> {
  const job = await emailQueue.add('send-email', data, {
    delay: Math.max(0, delayMs),
    jobId: data.emailJobId, // Using DB emailJobId as BullMQ jobId guarantees idempotency!
  });

  console.log(`[BullMQ Queue] Scheduled job ID: ${job.id} for recipient: ${data.recipientEmail} with delay: ${delayMs}ms`);
  return job.id || data.emailJobId;
}

export async function rescheduleEmailJob(jobId: string, data: EmailJobData, newDelayMs: number): Promise<void> {
  try {
    const existingJob = await emailQueue.getJob(jobId);
    if (existingJob) {
      await existingJob.remove();
    }
  } catch (err: any) {
    console.warn(`[BullMQ Queue Reschedule] Could not remove previous job ${jobId}: ${err.message}`);
  }

  await emailQueue.add('send-email', data, {
    delay: Math.max(0, newDelayMs),
    jobId: jobId,
  });

  console.log(`[BullMQ Queue] Rescheduled job ID: ${jobId} with new delay: ${newDelayMs}ms`);
}

export async function cancelEmailJob(jobId: string): Promise<boolean> {
  try {
    const job = await emailQueue.getJob(jobId);
    if (job) {
      await job.remove();
      console.log(`[BullMQ Queue] Removed job ID: ${jobId}`);
      return true;
    }
  } catch (err: any) {
    console.error(`[BullMQ Queue Cancel Error] ${err.message}`);
  }
  return false;
}

export async function getQueueMetrics() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed, total: waiting + active + completed + failed + delayed };
}
