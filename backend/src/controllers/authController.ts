import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function googleAuthHandler(req: Request, res: Response) {
  try {
    const { email, name, avatarUrl, googleId } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split('@')[0],
          avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}`,
          googleId: googleId || null,
        },
      });
    } else if (googleId && !user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, avatarUrl: avatarUrl || user.avatarUrl },
      });
    }

    return res.json({
      message: 'Authentication successful',
      user,
    });
  } catch (error: any) {
    console.error('[Auth Error]', error);
    return res.status(500).json({ error: 'Authentication failed', details: error.message });
  }
}

export async function getCurrentUserHandler(req: Request, res: Response) {
  try {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'demo.user@reachinbox.ai',
          name: 'Demo User',
          avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=reachinbox_demo',
        },
      });
    }

    return res.json({ user });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
