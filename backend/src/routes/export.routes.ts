import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { exportService } from '../services/export.service';

const router = Router();
router.use(authenticate);

// Export expenses as CSV
router.get('/expenses', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query;
    const expenses = await exportService.getExpensesForExport(
      req.user!.id,
      from as string,
      to as string
    );
    const csv = exportService.buildExpensesCsv(expenses);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

// Export settlements as CSV
router.get('/settlements', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const settlements = await exportService.getSettlementsForExport(req.user!.id);
    const csv = exportService.buildSettlementsCsv(settlements);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=settlements_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

export default router;
