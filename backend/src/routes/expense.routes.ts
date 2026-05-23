import { Router } from 'express';
import * as expenseController from '../controllers/expense.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/balances', expenseController.getUserBalances);
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.get('/:id', expenseController.getExpenseById);
router.patch('/:id', expenseController.updateExpense);
router.delete('/:id', expenseController.deleteExpense);

export default router;
