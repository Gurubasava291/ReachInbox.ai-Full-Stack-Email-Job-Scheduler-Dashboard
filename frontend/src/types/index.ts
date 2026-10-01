export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleId?: string;
}

export type EmailStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'RATE_LIMITED_RESCHEDULED' | 'CANCELLED';

export interface EmailJob {
  id: string;
  campaignId?: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string;
  status: EmailStatus;
  bullJobId?: string;
  attempts: number;
  errorReason?: string;
  etherealPreviewUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlackStatus {
  isConnected: boolean;
  webhookUrl?: string;
  teamName?: string;
  channel?: string;
  updatedAt?: string;
}

export interface QueueMetrics {
  bullmq: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
    total: number;
  };
  db: {
    scheduled: number;
    sent: number;
    failed: number;
    rateLimitedRescheduled: number;
  };
}

export interface SystemConfig {
  workerConcurrency: number;
  minEmailDelayMs: number;
  maxEmailsPerHourPerSender: number;
}
