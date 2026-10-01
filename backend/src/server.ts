import express from 'express';
import cors from 'cors';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { initElasticsearchIndex } from './config/elasticsearch';
import { emailQueue } from './queue/emailQueue';
import { setupEmailWorker } from './queue/emailWorker';
import { syncScheduledJobsOnStartup } from './queue/startupSync';

import authRoutes from './routes/authRoutes';
import slackRoutes from './routes/slackRoutes';
import emailRoutes from './routes/emailRoutes';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Setup Bull Board UI at /admin/queues
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/slack', slackRoutes);
app.use('/api/emails', emailRoutes);

// Health Check Endpoint
app.get('/health', async (req, res) => {
  return res.json({
    status: 'ok',
    service: 'ReachInbox Email Job Scheduler',
    timestamp: new Date().toISOString(),
    env: {
      concurrency: env.WORKER_CONCURRENCY,
      minDelayMs: env.MIN_EMAIL_DELAY_MS,
      maxHourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
    },
    bullBoardUrl: `http://localhost:${env.PORT}/admin/queues`,
  });
});

const PORT = env.PORT;

async function startServer() {
  try {
    // 1. Initialize Elasticsearch index if needed
    await initElasticsearchIndex();

    // 2. Start BullMQ Worker
    setupEmailWorker();

    // 3. Sync & recover DB persistent scheduled jobs into BullMQ
    await syncScheduledJobsOnStartup();

    app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 ReachInbox Email Scheduler Backend running on port ${PORT}`);
      console.log(`📊 Live BullMQ Dashboard: http://localhost:${PORT}/admin/queues`);
      console.log(`=======================================================`);
    });
  } catch (error: any) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
