import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { friendService } from '../services/friend.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const sendFriendRequest = [
  body('email').isEmail().withMessage('Valid email required'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await friendService.sendRequest(req.user!.id, req.body.email);
      res.status(201).json({ success: true, data: result });
    } catch (err) { next(err); }
  },
];

export const acceptRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await friendService.acceptRequest(req.params.id, req.user!.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const rejectRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await friendService.rejectRequest(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Request rejected' });
  } catch (err) { next(err); }
};

export const getFriends = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const friends = await friendService.getFriends(req.user!.id);
    res.json({ success: true, data: friends });
  } catch (err) { next(err); }
};

export const getIncomingRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await friendService.getIncomingRequests(req.user!.id);
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

export const getOutgoingRequests = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const requests = await friendService.getOutgoingRequests(req.user!.id);
    res.json({ success: true, data: requests });
  } catch (err) { next(err); }
};

export const removeFriend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await friendService.removeFriend(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Friend removed' });
  } catch (err) { next(err); }
};

export const getBalanceWithFriend = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const balance = await friendService.getBalanceWithFriend(req.user!.id, req.params.friendId);
    res.json({ success: true, data: balance });
  } catch (err) { next(err); }
};
