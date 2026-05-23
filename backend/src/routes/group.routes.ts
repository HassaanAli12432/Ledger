import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', groupController.getUserGroups);
router.post('/', groupController.createGroup);
router.get('/:id', groupController.getGroupById);
router.post('/:id/members', groupController.addMember);
router.get('/:id/balances', groupController.getGroupBalances);

export default router;
