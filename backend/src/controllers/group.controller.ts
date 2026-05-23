import { Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { groupService } from '../services/group.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const createGroup = [
  body('name').trim().notEmpty().withMessage('Group name is required'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, description, type, currency, memberIds } = req.body;
      const group = await groupService.createGroup({
        name,
        description,
        type,
        currency,
        createdById: req.user!.id,
        memberIds,
      });
      res.status(201).json({ success: true, data: group });
    } catch (err) {
      next(err);
    }
  },
];

export const getUserGroups = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const groups = await groupService.getUserGroups(req.user!.id);
    res.json({ success: true, data: groups });
  } catch (err) {
    next(err);
  }
};

export const getGroupById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const group = await groupService.getGroupById(req.params.id, req.user!.id);
    res.json({ success: true, data: group });
  } catch (err) {
    next(err);
  }
};

export const addMember = [
  body('email').isEmail().withMessage('Valid email is required'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const user = await groupService.addMember(
        req.params.id,
        req.user!.id,
        req.body.email
      );
      res.json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  },
];

export const getGroupBalances = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const balances = await groupService.getGroupBalances(req.params.id);
    res.json({ success: true, data: balances });
  } catch (err) {
    next(err);
  }
};
