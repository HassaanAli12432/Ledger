import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { expenseService } from '../services/expense.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

import { pushService } from '../services/push.service';
import { emailService } from '../services/email.service';

export const createExpense = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('splits').isArray({ min: 1 }).withMessage('At least one split is required'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title, description, amount, currency, category, groupId, splitType, date, splits } =
        req.body;

      const expense = await expenseService.createExpense({
        title,
        description,
        amount,
        currency,
        category,
        payerId: req.user!.id,
        groupId,
        splitType,
        date: date ? new Date(date) : undefined,
        splits,
      });

      // Emit socket event
      const io = req.app.get('io');
      if (io) {
        if (groupId) {
          io.to(`group:${groupId}`).emit('expense:created', expense);
        }
        // Also emit to all individual users involved
        (expense as any).splits.forEach((split: any) => {
          io.to(`user:${split.userId}`).emit('expense:created', expense);
        });
      }

      // Trigger Push and Email Notifications
      const payerName = req.user!.name;
      (expense as any).splits.forEach(async (split: any) => {
        // Don't notify the person who created it
        if (split.userId !== req.user!.id) {
          const splitAmount = Number(split.owedAmount);

          // Push Notification
          await pushService.sendNotification(split.userId, {
            title: `New Expense: ${title}`,
            body: `${payerName} added a new expense. You owe Rs. ${splitAmount.toFixed(2)}.`,
            url: '/dashboard',
          });

          // Email Notification
          if (split.user && split.user.email) {
            await emailService.sendExpenseNotification(
              split.user.email,
              split.user.name,
              title,
              splitAmount,
              payerName
            );
          }
        }
      });

      res.status(201).json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  },
];

export const getExpenses = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId, page, limit, search, category, dateFrom, dateTo, minAmount, maxAmount } = req.query;
    const result = await expenseService.getExpenses(
      req.user!.id,
      {
        groupId: groupId as string,
        search: search as string,
        category: category as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        minAmount: minAmount ? parseFloat(minAmount as string) : undefined,
        maxAmount: maxAmount ? parseFloat(maxAmount as string) : undefined,
      },
      parseInt((page as string) || '1'),
      parseInt((limit as string) || '20')
    );
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const expense = await expenseService.getExpenseById(req.params.id, req.user!.id);
    res.json({ success: true, data: expense });
  } catch (err) {
    next(err);
  }
};

export const updateExpense = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { title, description, category, date } = req.body;
      const expense = await expenseService.updateExpense(req.params.id, req.user!.id, {
        title,
        description,
        category,
        date: date ? new Date(date) : undefined,
      });
      res.json({ success: true, data: expense });
    } catch (err) {
      next(err);
    }
  },
];

export const deleteExpense = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await expenseService.deleteExpense(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    next(err);
  }
};

export const getUserBalances = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const balances = await expenseService.getUserBalances(req.user!.id);
    res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
};
