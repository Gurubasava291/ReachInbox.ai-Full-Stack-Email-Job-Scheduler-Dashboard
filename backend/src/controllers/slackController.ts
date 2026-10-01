import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { sendSlackRateLimitNotification } from '../services/slackService';

export async function saveSlackWebhookHandler(req: Request, res: Response) {
  try {
    const { userId, webhookUrl, channel } = req.body;

    if (!webhookUrl) {
      return res.status(400).json({ error: 'Webhook URL is required' });
    }

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

    const connection = await prisma.slackConnection.upsert({
      where: { id: (await prisma.slackConnection.findFirst({ where: { userId: targetUserId } }))?.id || 'new-conn' },
      create: {
        userId: targetUserId,
        webhookUrl,
        channel: channel || '#general',
        isConnected: true,
      },
      update: {
        webhookUrl,
        channel: channel || '#general',
        isConnected: true,
      },
    });

    return res.json({
      message: 'Slack webhook connected successfully',
      connection,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function getSlackStatusHandler(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);

    let connection = null;
    if (userId) {
      connection = await prisma.slackConnection.findFirst({ where: { userId, isConnected: true } });
    }
    if (!connection) {
      connection = await prisma.slackConnection.findFirst({ where: { isConnected: true } });
    }

    return res.json({
      isConnected: !!connection,
      webhookUrl: connection?.webhookUrl || env.SLACK_DEFAULT_WEBHOOK_URL || null,
      teamName: connection?.teamName || null,
      channel: connection?.channel || '#general',
      updatedAt: connection?.updatedAt || null,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function disconnectSlackHandler(req: Request, res: Response) {
  try {
    const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string);

    await prisma.slackConnection.updateMany({
      where: userId ? { userId } : {},
      data: { isConnected: false },
    });

    return res.json({ message: 'Slack disconnected successfully' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function testSlackNotificationHandler(req: Request, res: Response) {
  try {
    const userId = (req.body.userId as string) || (req.headers['x-user-id'] as string);
    const { senderEmail } = req.body;

    const sent = await sendSlackRateLimitNotification(userId, {
      senderEmail: senderEmail || 'demo.sender@reachinbox.ai',
      hourKey: new Date().toISOString().substring(0, 13).replace('T', '-'),
      limit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
      rescheduledCount: 3,
      nextAvailableWindow: new Date(Date.now() + 3600000).toUTCString(),
    });

    if (sent) {
      return res.json({ message: 'Live Slack notification test sent successfully!' });
    } else {
      return res.status(400).json({ error: 'Slack is not connected. Please provide a Slack Webhook URL first.' });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function slackOAuthRedirectHandler(req: Request, res: Response) {
  const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=chat:write,incoming-webhook&redirect_uri=${encodeURIComponent(env.SLACK_REDIRECT_URI)}`;
  return res.redirect(slackAuthUrl);
}

export async function slackOAuthCallbackHandler(req: Request, res: Response) {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${env.FRONTEND_URL}?slack_error=missing_code`);
    }

    const tokenResponse = await axios.post(
      'https://slack.com/api/oauth.v2.access',
      new URLSearchParams({
        client_id: env.SLACK_CLIENT_ID,
        client_secret: env.SLACK_CLIENT_SECRET,
        code: String(code),
        redirect_uri: env.SLACK_REDIRECT_URI,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    if (tokenResponse.data.ok) {
      const firstUser = await prisma.user.findFirst();
      const userId = firstUser ? firstUser.id : (await prisma.user.create({ data: { email: 'demo@reachinbox.ai', name: 'Demo User' } })).id;

      await prisma.slackConnection.create({
        data: {
          userId,
          botAccessToken: tokenResponse.data.access_token,
          webhookUrl: tokenResponse.data.incoming_webhook?.url || null,
          teamId: tokenResponse.data.team?.id || null,
          teamName: tokenResponse.data.team?.name || 'Slack Team',
          channel: tokenResponse.data.incoming_webhook?.channel || '#general',
          isConnected: true,
        },
      });

      return res.redirect(`${env.FRONTEND_URL}?slack_status=connected`);
    } else {
      return res.redirect(`${env.FRONTEND_URL}?slack_error=${encodeURIComponent(tokenResponse.data.error || 'oauth_failed')}`);
    }
  } catch (error: any) {
    return res.redirect(`${env.FRONTEND_URL}?slack_error=${encodeURIComponent(error.message)}`);
  }
}
