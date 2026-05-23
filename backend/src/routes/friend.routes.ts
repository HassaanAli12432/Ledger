import { Router } from 'express';
import * as friendController from '../controllers/friend.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

router.get('/', friendController.getFriends);
router.post('/', friendController.sendFriendRequest);
router.get('/requests/incoming', friendController.getIncomingRequests);
router.get('/requests/outgoing', friendController.getOutgoingRequests);
router.patch('/:id/accept', friendController.acceptRequest);
router.patch('/:id/reject', friendController.rejectRequest);
router.delete('/:id', friendController.removeFriend);
router.get('/balance/:friendId', friendController.getBalanceWithFriend);

export default router;
