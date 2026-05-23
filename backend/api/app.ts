import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { errorHandler, notFound } from '../src/middleware/error.middleware';
import authRoutes from '../src/routes/auth.routes';
import expenseRoutes from '../src/routes/expense.routes';
import groupRoutes from '../src/routes/group.routes';
import settlementRoutes from '../src/routes/settlement.routes';
import userRoutes from '../src/routes/user.routes';
import friendRoutes from '../src/routes/friend.routes';
import pushRoutes from '../src/routes/push.routes';
import chatRoutes from '../src/routes/chat.routes';
import analyticsRoutes from '../src/routes/analytics.routes';
import exportRoutes from '../src/routes/export.routes';

const app = express();

// ===========================
// Security Middleware
// ===========================
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// ===========================
// Rate Limiting
// ===========================
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many auth attempts, please try again later.' },
});
app.use('/api/auth', authLimiter);

// ===========================
// Body Parsing
// ===========================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================
// Logging
// ===========================
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ===========================
// Static Files (uploads)
// ===========================
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ===========================
// Health Check
// ===========================
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// ===========================
// API Routes
// ===========================
app.use('/api/auth', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/settlements', settlementRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/export', exportRoutes);

// ===========================
// Error Handling
// ===========================
app.use(notFound);
app.use(errorHandler);

export default app;
