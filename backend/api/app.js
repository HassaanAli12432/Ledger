require('dotenv/config');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { errorHandler, notFound } = require('../src/middleware/error.middleware');
const authRoutes = require('../src/routes/auth.routes').default;
const expenseRoutes = require('../src/routes/expense.routes').default;
const groupRoutes = require('../src/routes/group.routes').default;
const settlementRoutes = require('../src/routes/settlement.routes').default;
const userRoutes = require('../src/routes/user.routes').default;
const friendRoutes = require('../src/routes/friend.routes').default;
const pushRoutes = require('../src/routes/push.routes').default;
const chatRoutes = require('../src/routes/chat.routes').default;
const analyticsRoutes = require('../src/routes/analytics.routes').default;
const exportRoutes = require('../src/routes/export.routes').default;

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
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

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('combined'));

// Root & Health Check
app.get('/', (_, res) => {
  res.json({ name: 'Ledger API', version: '1.0.0', status: 'running', docs: '/health' });
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
});

// API Routes
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

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
