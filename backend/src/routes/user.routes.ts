import { Router } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { AuthRequest } from '../middleware/auth.middleware';
import { Response, NextFunction } from 'express';

const router = Router();

router.use(authenticate);

// GET /api/users/search?email=...
router.get('/search', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { email, name } = req.query;
    const users = await prisma.user.findMany({
      where: {
        OR: [
          ...(email ? [{ email: { contains: email as string, mode: 'insensitive' as const } }] : []),
          ...(name ? [{ name: { contains: name as string, mode: 'insensitive' as const } }] : []),
        ],
        NOT: { id: req.user!.id },
      },
      select: { id: true, name: true, email: true, avatarUrl: true },
      take: 10,
    });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/profile
router.get('/me/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        currency: true, phoneNumber: true, createdAt: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/profile
router.patch('/me/profile', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { name, currency, phoneNumber } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: { name, currency, phoneNumber },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        currency: true, phoneNumber: true,
      },
    });
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/activities
router.get('/me/activities', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt((req.query.page as string) || '1');
    const limit = parseInt((req.query.limit as string) || '20');

    const activities = await prisma.activity.findMany({
      where: { userId: req.user!.id },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        expense: { select: { id: true, title: true, amount: true } },
        settlement: { select: { id: true, amount: true } },
      },
    });

    res.json({ success: true, data: activities });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/notifications
router.get('/me/notifications', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/notifications/read
router.patch('/me/notifications/read', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
