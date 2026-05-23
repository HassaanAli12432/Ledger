import { Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authService } from '../services/auth.service';
import { validate } from '../middleware/validate.middleware';
import { AuthRequest } from '../middleware/auth.middleware';

export const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const register = [
  ...registerValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const result = await authService.register(name, email, password);
      res.status(201).json({ success: true, message: 'Registration successful', data: result });
    } catch (err) {
      next(err);
    }
  },
];

export const login = [
  ...loginValidation,
  validate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, message: 'Login successful', data: result });
    } catch (err) {
      next(err);
    }
  },
];

export const refreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, message: 'Refresh token required' });
      return;
    }
    const result = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await authService.logout(refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id, email, name } = req.user!;
    res.json({ success: true, data: { id, email, name } });
  } catch (err) {
    next(err);
  }
};

export const googleCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { googleId, email, name, avatarUrl } = req.body;
    const result = await authService.googleAuth(googleId, email, name, avatarUrl);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
