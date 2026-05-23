import { Router } from 'express';
import { subscribe } from '../controllers/push.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/subscribe', authenticate, subscribe);

export default router;
