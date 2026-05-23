import { Router } from 'express';
import { getMessages, sendMessage, getUnreadCounts } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get('/unread', authenticate, getUnreadCounts);
router.get('/:friendId', authenticate, getMessages);
router.post('/:friendId', authenticate, sendMessage);

export default router;
