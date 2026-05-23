import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import prisma from '../lib/prisma';
import logger from '../lib/logger';

export const subscribe = async (req: AuthRequest, res: Response) => {
  try {
    const { subscription } = req.body;
    const userId = req.user?.id;

    if (!userId || !subscription) {
      return res.status(400).json({ status: 'fail', message: 'Missing subscription or user ID' });
    }

    // We reuse the fcmToken column to store the stringified subscription object
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken: JSON.stringify(subscription) },
    });

    res.status(200).json({ status: 'success', message: 'Subscribed to push notifications' });
  } catch (err: any) {
    logger.error('Push subscribe error', { error: err.message });
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
};
