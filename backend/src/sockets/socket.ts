import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const setupSockets = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: string };
      socket.userId = decoded.id;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.userId})`);

    // Join user's personal room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
    }

    // Join group rooms
    socket.on('join:group', (groupId: string) => {
      socket.join(`group:${groupId}`);
      logger.debug(`User ${socket.userId} joined group room ${groupId}`);
    });

    socket.on('leave:group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
    });

    // Typing indicator for comments
    socket.on('typing:start', (data: { expenseId: string }) => {
      socket.to(`expense:${data.expenseId}`).emit('typing:start', {
        userId: socket.userId,
      });
    });

    socket.on('typing:stop', (data: { expenseId: string }) => {
      socket.to(`expense:${data.expenseId}`).emit('typing:stop', {
        userId: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

// Helper to emit to specific user
export const emitToUser = (io: Server, userId: string, event: string, data: unknown) => {
  io.to(`user:${userId}`).emit(event, data);
};

// Helper to emit to group
export const emitToGroup = (io: Server, groupId: string, event: string, data: unknown) => {
  io.to(`group:${groupId}`).emit(event, data);
};
