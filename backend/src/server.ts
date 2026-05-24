import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import app from '../api/app';
import { setupSockets } from './sockets/socket';
import { setupCronJobs } from './jobs/reminders';
import prisma from './lib/prisma';
import logger from './lib/logger';

const PORT = parseInt(process.env.PORT || '5000');

const httpServer = http.createServer(app);

// ===========================
// Socket.IO
// ===========================
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
});

setupSockets(io);

// Make io available in request handlers
app.set('io', io);

// ===========================
// Start Server
// ===========================
const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('✅ Database connected');

    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📡 Socket.IO ready`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);
    });

    // Initialize cron jobs
    if (process.env.NODE_ENV !== 'test') {
      setupCronJobs();
    }
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// ===========================
// Graceful Shutdown
// ===========================
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
