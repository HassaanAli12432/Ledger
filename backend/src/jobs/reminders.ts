import cron from 'node-cron';
import prisma from '../lib/prisma';
import { emailService } from '../services/email.service';
import logger from '../lib/logger';

export const setupCronJobs = () => {
  // Daily payment reminders at 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('Running daily payment reminder job');
    try {
      const unpaidSplits = await prisma.expenseSplit.findMany({
        where: {
          isPaid: false,
          expense: { isDeleted: false },
        },
        include: {
          user: true,
          expense: {
            include: { payer: { select: { name: true } } },
          },
        },
      });

      // Group by user
      const userDebts: Record<string, { amount: number; owedTo: string }[]> = {};
      for (const split of unpaidSplits) {
        if (split.userId === split.expense.payerId) continue;
        const owed = Number(split.owedAmount) - Number(split.paidAmount);
        if (owed <= 0) continue;

        if (!userDebts[split.userId]) userDebts[split.userId] = [];
        userDebts[split.userId].push({ amount: owed, owedTo: split.expense.payer.name });
      }

      for (const split of unpaidSplits) {
        if (!userDebts[split.userId]) continue;
        const totalOwed = userDebts[split.userId].reduce((s, d) => s + d.amount, 0);
        if (totalOwed > 0) {
          await emailService.sendPaymentReminder(
            split.user.email,
            split.user.name,
            totalOwed,
            userDebts[split.userId][0].owedTo
          );
          delete userDebts[split.userId]; // Only send once per user
        }
      }
    } catch (err) {
      logger.error('Daily reminder job failed', { error: err });
    }
  });

  // Weekly expense summary every Monday at 8:00 AM
  cron.schedule('0 8 * * 1', async () => {
    logger.info('Running weekly summary job');
  });

  // Cleanup old refresh tokens daily at midnight
  cron.schedule('0 0 * * *', async () => {
    try {
      const deleted = await prisma.refreshToken.deleteMany({
        where: { expiresAt: { lt: new Date() } },
      });
      logger.info(`Cleaned up ${deleted.count} expired refresh tokens`);
    } catch (err) {
      logger.error('Token cleanup job failed', { error: err });
    }
  });

  logger.info('Cron jobs initialized');
};
