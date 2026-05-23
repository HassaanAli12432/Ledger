import { Router } from 'express';
import * as settlementController from '../controllers/settlement.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/debts', settlementController.getMyDebts);
router.get('/', settlementController.getSettlements);
router.post('/', settlementController.createSettlement);

export default router;
