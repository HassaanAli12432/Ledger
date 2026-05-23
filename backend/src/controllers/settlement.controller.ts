import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { settlementService } from '../services/settlement.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

import { pushService } from '../services/push.service';
import { emailService } from '../services/email.service';

export const createSettlement = [
  body('toId').notEmpty().withMessage('Recipient ID is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { toId, amount, groupId, note, method } = req.body;
      const settlement = await settlementService.createSettlement({
        fromId: req.user!.id,
        toId,
        amount,
        groupId,
        note,
        method,
      });

      const io = req.app.get('io');
      if (io) {
        io.to(`user:${settlement.fromId}`).emit('settlement:created', settlement);
        io.to(`user:${settlement.toId}`).emit('settlement:created', settlement);
        if (groupId) {
          io.to(`group:${groupId}`).emit('settlement:created', settlement);
        }
      }

      // Trigger Push and Email Notifications
      const payerName = req.user!.name;
      
      // Push Notification
      await pushService.sendNotification(toId, {
        title: 'Payment Received',
        body: `${payerName} paid you Rs. ${Number(amount).toFixed(2)}.`,
        url: '/settlements',
      });

      // Email Notification
      if (settlement.to && (settlement.to as any).email) {
        await emailService.sendSettlementConfirmation(
          (settlement.to as any).email,
          settlement.to.name,
          amount,
          payerName
        );
      }

      res.status(201).json({ success: true, data: settlement });
    } catch (err) {
      next(err);
    }
  },
];

export const getSettlements = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId, page, limit } = req.query;
    const result = await settlementService.getSettlements(
      req.user!.id,
      groupId as string,
      parseInt((page as string) || '1'),
      parseInt((limit as string) || '20')
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getMyDebts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const debts = await settlementService.getMyDebts(req.user!.id);
    res.json({ success: true, data: debts });
  } catch (err) {
    next(err);
  }
};
