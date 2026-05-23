import webpush from 'web-push';
import logger from '../lib/logger';
import prisma from '../lib/prisma';

// Configure Web Push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@splitwise.local',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('VAPID keys not configured for push notifications.');
}

export const pushService = {
  async sendNotification(userId: string, payload: any) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { fcmToken: true },
      });

      if (!user || !user.fcmToken) {
        return; // User has not subscribed
      }

      // We are reusing the fcmToken column to store the Web Push Subscription JSON
      const subscription = JSON.parse(user.fcmToken);

      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err: any) {
      if (err.statusCode === 410) {
        // Subscription is expired or invalid
        logger.info(`Removing expired push subscription for user ${userId}`);
        await prisma.user.update({
          where: { id: userId },
          data: { fcmToken: null },
        });
      } else {
        logger.error('Failed to send push notification', { 
          error: err.message || err, 
          statusCode: err.statusCode,
          body: err.body
        });
      }
    }
  },
};
