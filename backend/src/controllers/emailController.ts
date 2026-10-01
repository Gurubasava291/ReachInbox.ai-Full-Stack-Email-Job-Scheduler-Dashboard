import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { scheduleEmailJob, cancelEmailJob, getQueueMetrics } from '../queue/emailQueue';
import { indexEmailInElasticsearch, searchEmailsInElasticsearch } from '../services/elasticsearchService';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export async function scheduleEmailsHandler(req: Request, res: Response) {
  try {
    const {
      senderEmail,
      subject,
      body,
      recipients,
      startTime,
      delaySeconds,
      hourlyLimit,
      userId,
    } = req.body;

    if (!senderEmail || !subject || !body || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'senderEmail, subject, body, and non-empty recipients array are required.' });
    }

    // Filter valid emails
    const validRecipients = recipients
      .map((r: string) => r.trim())
      .filter((r: string) => EMAIL_REGEX.test(r));

    if (validRecipients.length === 0) {
      return res.status(400).json({ error: 'No valid recipient email addresses detected.' });
    }

    // User lookup
    let targetUserId = userId;
    if (!targetUserId) {
      const firstUser = await prisma.user.findFirst();
      if (firstUser) targetUserId = firstUser.id;
      else {
        const newUser = await prisma.user.create({
          data: { email: 'demo.user@reachinbox.ai', name: 'Demo User' },
        });
        targetUserId = newUser.id;
      }
    }

    const perEmailDelayMs = Math.max(
      env.MIN_EMAIL_DELAY_MS,
      (delaySeconds !== undefined ? parseInt(delaySeconds, 10) : 2) * 1000
    );

    const senderHourlyLimit = hourlyLimit !== undefined
      ? parseInt(hourlyLimit, 10)
      : env.MAX_EMAILS_PER_HOUR_PER_SENDER;

    // Create Campaign record
    const campaign = await prisma.emailCampaign.create({
      data: {
        userId: targetUserId,
        title: `Campaign: ${subject.substring(0, 30)}...`,
        senderEmail,
        subject,
        body,
        totalRecipients: validRecipients.length,
        delaySeconds: Math.floor(perEmailDelayMs / 1000),
        hourlyLimit: senderHourlyLimit,
      },
    });

    const baseStartTime = startTime ? new Date(startTime).getTime() : Date.now();
    const createdJobs = [];
    const now = Date.now();

    for (let i = 0; i < validRecipients.length; i++) {
      const recipient = validRecipients[i];
      // Stagger each scheduled time by perEmailDelayMs
      const scheduledTimeMs = baseStartTime + i * perEmailDelayMs;
      const scheduledAtDate = new Date(scheduledTimeMs);
      const initialDelayMs = Math.max(0, scheduledTimeMs - now);

      // Create DB EmailJob
      const emailJob = await prisma.emailJob.create({
        data: {
          campaignId: campaign.id,
          senderEmail,
          recipientEmail: recipient,
          subject,
          body,
          scheduledAt: scheduledAtDate,
          status: 'SCHEDULED',
        },
      });

      // Schedule BullMQ job
      const bullJobId = await scheduleEmailJob(
        {
          emailJobId: emailJob.id,
          campaignId: campaign.id,
          senderEmail,
          recipientEmail: recipient,
          subject,
          body,
          userId: targetUserId,
          scheduledAtISO: scheduledAtDate.toISOString(),
        },
        initialDelayMs
      );

      // Update DB record with bullJobId
      await prisma.emailJob.update({
        where: { id: emailJob.id },
        data: { bullJobId },
      });

      // Index in Elasticsearch
      await indexEmailInElasticsearch({
        id: emailJob.id,
        campaignId: campaign.id,
        senderEmail,
        recipientEmail: recipient,
        subject,
        body,
        status: 'SCHEDULED',
        scheduledAt: scheduledAtDate,
        createdAt: new Date(),
      });

      createdJobs.push({
        id: emailJob.id,
        recipientEmail: recipient,
        scheduledAt: scheduledAtDate,
        delayMs: initialDelayMs,
      });
    }

    return res.status(201).json({
      message: `Successfully scheduled ${validRecipients.length} email(s).`,
      campaignId: campaign.id,
      totalScheduled: validRecipients.length,
      scheduledJobs: createdJobs,
    });
  } catch (error: any) {
    console.error('[Schedule Emails Error]', error);
    return res.status(500).json({ error: error.message });
  }
}

export async function getScheduledEmailsHandler(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const search = req.query.search as string;

    const whereCondition: any = {
      status: { in: ['SCHEDULED', 'RATE_LIMITED_RESCHEDULED', 'SENDING'] },
    };

    if (search) {
      whereCondition.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { senderEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where: whereCondition }),
      prisma.emailJob.findMany({
        where: whereCondition,
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSentEmailsHandler(req: Request, res: Response) {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '50', 10);
    const search = req.query.search as string;
    const statusFilter = req.query.status as string;

    const whereCondition: any = {
      status: statusFilter ? statusFilter : { in: ['SENT', 'FAILED', 'CANCELLED'] },
    };

    if (search) {
      whereCondition.OR = [
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { senderEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, emails] = await Promise.all([
      prisma.emailJob.count({ where: whereCondition }),
      prisma.emailJob.findMany({
        where: whereCondition,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({
      emails,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function searchEmailsHandler(req: Request, res: Response) {
  try {
    const query = (req.query.q as string || '').trim();
    const status = req.query.status as string;

    const results = await searchEmailsInElasticsearch(query, status);

    return res.json({
      query,
      count: results.length,
      emails: results,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function cancelEmailJobHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const job = await prisma.emailJob.findUnique({ where: { id } });
    if (!job) {
      return res.status(404).json({ error: 'Email job not found' });
    }

    if (job.bullJobId) {
      await cancelEmailJob(job.bullJobId);
    }
    await cancelEmailJob(id);

    const updated = await prisma.emailJob.update({
      where: { id },
      data: { status: 'CANCELLED', errorReason: 'Cancelled by user' },
    });

    await indexEmailInElasticsearch({
      id: updated.id,
      campaignId: updated.campaignId,
      senderEmail: updated.senderEmail,
      recipientEmail: updated.recipientEmail,
      subject: updated.subject,
      body: updated.body,
      status: 'CANCELLED',
      scheduledAt: updated.scheduledAt,
      createdAt: updated.createdAt,
    });

    return res.json({ message: 'Email job cancelled successfully', email: updated });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function parseCsvHandler(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf8');
    // Extract emails using regex across CSV or raw text lines
    const matches = fileContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    const uniqueEmails = Array.from(new Set(matches));

    return res.json({
      fileName: req.file.originalname,
      totalDetected: uniqueEmails.length,
      emails: uniqueEmails,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getQueueMetricsHandler(req: Request, res: Response) {
  try {
    const metrics = await getQueueMetrics();
    const [scheduledCount, sentCount, failedCount, rateLimitedCount] = await Promise.all([
      prisma.emailJob.count({ where: { status: 'SCHEDULED' } }),
      prisma.emailJob.count({ where: { status: 'SENT' } }),
      prisma.emailJob.count({ where: { status: 'FAILED' } }),
      prisma.emailJob.count({ where: { status: 'RATE_LIMITED_RESCHEDULED' } }),
    ]);

    return res.json({
      bullmq: metrics,
      db: {
        scheduled: scheduledCount,
        sent: sentCount,
        failed: failedCount,
        rateLimitedRescheduled: rateLimitedCount,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getConfigHandler(req: Request, res: Response) {
  return res.json({
    workerConcurrency: env.WORKER_CONCURRENCY,
    minEmailDelayMs: env.MIN_EMAIL_DELAY_MS,
    maxEmailsPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
  });
}

export async function updateConfigHandler(req: Request, res: Response) {
  const { workerConcurrency, minEmailDelayMs, maxEmailsPerHourPerSender } = req.body;

  if (workerConcurrency !== undefined) env.WORKER_CONCURRENCY = parseInt(workerConcurrency, 10);
  if (minEmailDelayMs !== undefined) env.MIN_EMAIL_DELAY_MS = parseInt(minEmailDelayMs, 10);
  if (maxEmailsPerHourPerSender !== undefined) env.MAX_EMAILS_PER_HOUR_PER_SENDER = parseInt(maxEmailsPerHourPerSender, 10);

  return res.json({
    message: 'System limits updated successfully',
    config: {
      workerConcurrency: env.WORKER_CONCURRENCY,
      minEmailDelayMs: env.MIN_EMAIL_DELAY_MS,
      maxEmailsPerHourPerSender: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    },
  });
}
