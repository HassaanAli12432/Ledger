import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { analyticsService } from '../services/analytics.service';

const router = Router();
router.use(authenticate);

router.get('/category-breakdown', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const data = await analyticsService.getCategoryBreakdown(req.user!.id, months);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly-trend', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const months = parseInt(req.query.months as string) || 6;
    const data = await analyticsService.getMonthlyTrend(req.user!.id, months);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/top-spenders', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { groupId } = req.query;
    const data = await analyticsService.getTopSpenders(req.user!.id, groupId as string);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/weekly-pattern', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await analyticsService.getWeeklyPattern(req.user!.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
