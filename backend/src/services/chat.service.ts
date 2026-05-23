import prisma from '../lib/prisma';

export const chatService = {
  async getMessages(userId: string, friendId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: friendId },
          { senderId: friendId, receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Mark unread messages as read
    await prisma.chatMessage.updateMany({
      where: {
        senderId: friendId,
        receiverId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return messages.reverse(); // Return in chronological order
  },

  async sendMessage(senderId: string, receiverId: string, text: string) {
    const message = await prisma.chatMessage.create({
      data: {
        senderId,
        receiverId,
        text,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return message;
  },

  async getUnreadCounts(userId: string) {
    const counts = await prisma.chatMessage.groupBy({
      by: ['senderId'],
      where: {
        receiverId: userId,
        isRead: false,
      },
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const c of counts) {
      result[c.senderId] = c._count;
    }
    return result;
  },
};
