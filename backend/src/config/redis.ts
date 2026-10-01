import Redis from 'ioredis';
import { env } from './env';

export const redisConnection = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null, // Required by BullMQ
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
});

redisConnection.on('error', (err) => {
  console.error('[Redis Error]', err.message);
});
