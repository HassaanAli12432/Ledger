import { Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { chatService } from '../services/chat.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const getMessages = [
  param('friendId').isUUID().withMessage('Invalid friend ID'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const messages = await chatService.getMessages(req.user!.id, req.params.friendId, page);

      // Emit read receipt via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.params.friendId}`).emit('chat:read', {
          readBy: req.user!.id,
        });
      }

      res.json({ success: true, data: messages });
    } catch (err) {
      next(err);
    }
  },
];

export const sendMessage = [
  param('friendId').isUUID().withMessage('Invalid friend ID'),
  body('text').trim().notEmpty().withMessage('Message text is required'),
  validate,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const message = await chatService.sendMessage(
        req.user!.id,
        req.params.friendId,
        req.body.text
      );

      // Emit real-time message via socket
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${req.params.friendId}`).emit('chat:message', message);
        io.to(`user:${req.user!.id}`).emit('chat:message', message);
      }

      res.status(201).json({ success: true, data: message });
    } catch (err) {
      next(err);
    }
  },
];

export const getUnreadCounts = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const counts = await chatService.getUnreadCounts(req.user!.id);
    res.json({ success: true, data: counts });
  } catch (err) {
    next(err);
  }
};
