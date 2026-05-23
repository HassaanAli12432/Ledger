import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

export const friendService = {
  async sendRequest(requesterId: string, email: string) {
    const receiver = await prisma.user.findUnique({ where: { email } });
    if (!receiver) throw createError('No user found with that email', 404);
    if (receiver.id === requesterId) throw createError('You cannot add yourself', 400);

    const existing = await prisma.friend.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
      },
    });
    if (existing) {
      if (existing.status === 'ACCEPTED') throw createError('Already friends', 409);
      if (existing.status === 'PENDING') throw createError('Friend request already sent', 409);
    }

    const friend = await prisma.friend.create({
      data: { requesterId, receiverId: receiver.id, status: 'PENDING' },
      include: {
        receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return friend;
  },

  async acceptRequest(friendId: string, userId: string) {
    const friend = await prisma.friend.findFirst({
      where: { id: friendId, receiverId: userId, status: 'PENDING' },
    });
    if (!friend) throw createError('Friend request not found', 404);

    return prisma.friend.update({
      where: { id: friendId },
      data: { status: 'ACCEPTED' },
      include: {
        requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  },

  async rejectRequest(friendId: string, userId: string) {
    const friend = await prisma.friend.findFirst({
      where: { id: friendId, receiverId: userId, status: 'PENDING' },
    });
    if (!friend) throw createError('Friend request not found', 404);

    return prisma.friend.update({ where: { id: friendId }, data: { status: 'REJECTED' } });
  },

  async getFriends(userId: string) {
    const friends = await prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ requesterId: userId }, { receiverId: userId }],
      },
      include: {
        requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
        receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return friends.map((f) => ({
      friendshipId: f.id,
      friend: f.requesterId === userId ? f.receiver : f.requester,
      since: f.createdAt,
    }));
  },

  async getIncomingRequests(userId: string) {
    return prisma.friend.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: {
        requester: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getOutgoingRequests(userId: string) {
    return prisma.friend.findMany({
      where: { requesterId: userId, status: 'PENDING' },
      include: {
        receiver: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  async removeFriend(friendId: string, userId: string) {
    const friend = await prisma.friend.findFirst({
      where: {
        id: friendId,
        OR: [{ requesterId: userId }, { receiverId: userId }],
        status: 'ACCEPTED',
      },
    });
    if (!friend) throw createError('Friendship not found', 404);
    await prisma.friend.delete({ where: { id: friendId } });
  },

  // Get net balance between two users (across all expenses)
  async getBalanceWithFriend(userId: string, friendId: string) {
    // What friend owes me (they are in splits for expenses I paid)
    const owedToMe = await prisma.expenseSplit.aggregate({
      where: {
        userId: friendId,
        isPaid: false,
        expense: { payerId: userId, isDeleted: false },
      },
      _sum: { owedAmount: true, paidAmount: true },
    });

    // What I owe friend (I am in splits for expenses they paid)
    const iOwe = await prisma.expenseSplit.aggregate({
      where: {
        userId,
        isPaid: false,
        expense: { payerId: friendId, isDeleted: false },
      },
      _sum: { owedAmount: true, paidAmount: true },
    });

    const owedToMeNet =
      Number(owedToMe._sum.owedAmount || 0) - Number(owedToMe._sum.paidAmount || 0);
    const iOweNet = Number(iOwe._sum.owedAmount || 0) - Number(iOwe._sum.paidAmount || 0);

    return {
      owedToMe: Math.max(0, owedToMeNet),
      iOwe: Math.max(0, iOweNet),
      net: owedToMeNet - iOweNet, // positive = they owe me, negative = I owe them
    };
  },
};
