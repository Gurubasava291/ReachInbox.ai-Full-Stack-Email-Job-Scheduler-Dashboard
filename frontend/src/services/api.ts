import axios from 'axios';
import { User, EmailJob, SlackStatus, QueueMetrics, SystemConfig } from '../types';

const API_BASE_URL = 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

export async function loginGoogle(userData: { email: string; name: string; avatarUrl?: string; googleId?: string }): Promise<User> {
  const res = await api.post('/auth/google', userData);
  return res.data.user;
}

export async function getCurrentUser(userId?: string): Promise<User> {
  const res = await api.get('/auth/me', {
    headers: userId ? { 'x-user-id': userId } : {},
  });
  return res.data.user;
}

export async function scheduleEmails(payload: {
  senderEmail: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime?: string;
  delaySeconds?: number;
  hourlyLimit?: number;
  userId?: string;
}) {
  const res = await api.post('/emails/schedule', payload);
  return res.data;
}

export async function getScheduledEmails(page = 1, limit = 50, search = ''): Promise<{ emails: EmailJob[]; pagination: any }> {
  const res = await api.get('/emails/scheduled', {
    params: { page, limit, search },
  });
  return res.data;
}

export async function getSentEmails(page = 1, limit = 50, search = '', status = ''): Promise<{ emails: EmailJob[]; pagination: any }> {
  const res = await api.get('/emails/sent', {
    params: { page, limit, search, status },
  });
  return res.data;
}

export async function searchEmails(query: string, status?: string): Promise<{ query: string; count: number; emails: EmailJob[] }> {
  const res = await api.get('/emails/search', {
    params: { q: query, status },
  });
  return res.data;
}

export async function cancelEmailJob(id: string) {
  const res = await api.delete(`/emails/${id}`);
  return res.data;
}

export async function parseCsvFile(file: File): Promise<{ fileName: string; totalDetected: number; emails: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/emails/parse-csv', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function getQueueMetrics(): Promise<QueueMetrics> {
  const res = await api.get('/emails/queue-metrics');
  return res.data;
}

export async function getSlackStatus(userId?: string): Promise<SlackStatus> {
  const res = await api.get('/slack/status', {
    headers: userId ? { 'x-user-id': userId } : {},
  });
  return res.data;
}

export async function saveSlackWebhook(webhookUrl: string, userId?: string, channel?: string) {
  const res = await api.post('/slack/webhook', { webhookUrl, userId, channel });
  return res.data;
}

export async function disconnectSlack(userId?: string) {
  const res = await api.post('/slack/disconnect', { userId });
  return res.data;
}

export async function testSlackNotification(userId?: string, senderEmail?: string) {
  const res = await api.post('/slack/test', { userId, senderEmail });
  return res.data;
}

export async function getSystemConfig(): Promise<SystemConfig> {
  const res = await api.get('/emails/config');
  return res.data;
}

export async function updateSystemConfig(config: Partial<SystemConfig>): Promise<{ config: SystemConfig }> {
  const res = await api.post('/emails/config', config);
  return res.data;
}
