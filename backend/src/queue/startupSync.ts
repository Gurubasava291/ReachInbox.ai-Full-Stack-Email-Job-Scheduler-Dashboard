import { prisma } from '../config/db';
import { emailQueue, EmailJobData } from './emailQueue';

export async function syncScheduledJobsOnStartup(): Promise<void> {
  console.log('[Startup Sync] Verifying persistent email jobs in database vs BullMQ...');

  try {
    const pendingJobs = await prisma.emailJob.findMany({
      where: {
        status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED'] },
      },
    });

    console.log(`[Startup Sync] Found ${pendingJobs.length} pending email job(s) in DB.`);

    let resyncedCount = 0;
    const now = Date.now();

    for (const job of pendingJobs) {
      const existingBullJob = await emailQueue.getJob(job.id);

      if (!existingBullJob) {
        const scheduledTimeMs = new Date(job.scheduledAt).getTime();
        const remainingDelayMs = Math.max(0, scheduledTimeMs - now);

        const jobData: EmailJobData = {
          emailJobId: job.id,
          campaignId: job.campaignId,
          senderEmail: job.senderEmail,
          recipientEmail: job.recipientEmail,
          subject: job.subject,
          body: job.body,
          scheduledAtISO: job.scheduledAt.toISOString(),
        };

        await emailQueue.add('send-email', jobData, {
          delay: remainingDelayMs,
          jobId: job.id,
        });

        resyncedCount++;
        console.log(`[Startup Sync] Restored job ${job.id} to BullMQ (Remaining delay: ${remainingDelayMs}ms)`);
      } else {
        console.log(`[Startup Sync] Job ${job.id} already active/delayed in BullMQ queue.`);
      }
    }

    console.log(`[Startup Sync Complete] Successfully synchronized ${resyncedCount} job(s) into BullMQ queue.`);
  } catch (error: any) {
    console.error(`[Startup Sync Error] ${error.message}`);
  }
}
