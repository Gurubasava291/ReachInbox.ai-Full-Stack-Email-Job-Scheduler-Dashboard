import axios from 'axios';
import { prisma } from '../config/db';
import { env } from '../config/env';

export interface SlackNotificationPayload {
  senderEmail: string;
  hourKey: string;
  limit: number;
  rescheduledCount: number;
  nextAvailableWindow: string;
}

export async function sendSlackRateLimitNotification(
  userId: string | undefined,
  payload: SlackNotificationPayload
): Promise<boolean> {
  try {
    // Find Slack connection for user or fallback to global default webhook
    let slackConn = null;
    if (userId) {
      slackConn = await prisma.slackConnection.findFirst({
        where: { userId, isConnected: true },
      });
    }

    if (!slackConn) {
      // Fallback: search any connected Slack or default webhook
      slackConn = await prisma.slackConnection.findFirst({
        where: { isConnected: true },
      });
    }

    const webhookUrl = slackConn?.webhookUrl || env.SLACK_DEFAULT_WEBHOOK_URL;
    const botToken = slackConn?.botAccessToken;
    const channel = slackConn?.channel || '#general';

    if (!webhookUrl && !botToken) {
      console.log(`[Slack] No active Slack connection found for rate limit alert. Notification skipped safely.`);
      return false;
    }

    const messageBlocks = {
      text: `⚠️ *ReachInbox Email Sender Rate Limit Reached!*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '⚠️ ReachInbox Hourly Rate Limit Hit',
            emoji: true,
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Sender Email:*\n\`${payload.senderEmail}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Hourly Limit:*\n\`${payload.limit} emails/hour\``,
            },
            {
              type: 'mrkdwn',
              text: `*Time Window:*\n\`${payload.hourKey}\``,
            },
            {
              type: 'mrkdwn',
              text: `*Rescheduled Jobs:*\n\`${payload.rescheduledCount} email(s)\``,
            },
          ],
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🔄 *Action Taken:* Rate limit reached for sender \`${payload.senderEmail}\`. Pending emails have been automatically postponed to the next hourly window: *${payload.nextAvailableWindow}*. No jobs were dropped!`,
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `ReachInbox Scheduler Engine • ${new Date().toISOString()}`,
            },
          ],
        },
      ],
    };

    if (webhookUrl) {
      console.log(`[Slack] Sending live rate limit alert via Webhook...`);
      await axios.post(webhookUrl, messageBlocks);
      console.log(`[Slack Notification] Webhook notification sent successfully!`);
      return true;
    } else if (botToken) {
      console.log(`[Slack] Sending live rate limit alert via Chat API...`);
      await axios.post(
        'https://slack.com/api/chat.postMessage',
        {
          channel: channel,
          ...messageBlocks,
        },
        {
          headers: {
            Authorization: `Bearer ${botToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[Slack Notification] Chat API notification sent successfully!`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error(`[Slack Notification Failed] ${error.message}`);
    return false;
  }
}
