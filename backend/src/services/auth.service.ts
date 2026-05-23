import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';
import { emailService } from './email.service';

const SALT_ROUNDS = 12;

export const generateTokens = (user: { id: string; email: string; name: string }) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

export const authService = {
  async register(name: string, email: string, password: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw createError('Email already in use', 409);

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, avatarUrl: true, currency: true, createdAt: true },
    });

    const { accessToken, refreshToken } = generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user.email, user.name).catch(() => {});

    return { user, accessToken, refreshToken };
  },

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) throw createError('Invalid credentials', 401);

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) throw createError('Invalid credentials', 401);

    const { accessToken, refreshToken } = generateTokens(user);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  },

  async refreshAccessToken(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw createError('Invalid or expired refresh token', 401);
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true },
    });

    if (!user) throw createError('User not found', 401);

    // Rotate token — use deleteMany so it doesn't crash if already consumed (race condition)
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: newRefreshToken, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken: newRefreshToken };
  },

  async logout(refreshToken: string) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  },

  async googleAuth(googleId: string, email: string, name: string, avatarUrl?: string) {
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // Check if user exists with same email
      user = await prisma.user.findUnique({ where: { email } });
      if (user) {
        user = await prisma.user.update({
          where: { email },
          data: { googleId, avatarUrl: avatarUrl || user.avatarUrl, isEmailVerified: true },
        });
      } else {
        user = await prisma.user.create({
          data: {
            name,
            email,
            googleId,
            avatarUrl,
            isEmailVerified: true,
          },
        });
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt },
    });

    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, accessToken, refreshToken };
  },
};
