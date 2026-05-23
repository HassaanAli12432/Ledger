import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

export const groupService = {
  async createGroup(data: {
    name: string;
    description?: string;
    type?: string;
    currency?: string;
    createdById: string;
    memberIds?: string[];
  }) {
    const group = await prisma.group.create({
      data: {
        name: data.name,
        description: data.description,
        type: (data.type as any) || 'OTHER',
        currency: data.currency || 'USD',
        createdById: data.createdById,
        members: {
          create: [
            { userId: data.createdById, role: 'ADMIN' },
            ...(data.memberIds || [])
              .filter((id) => id !== data.createdById)
              .map((userId) => ({ userId, role: 'MEMBER' as const })),
          ],
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
        },
      },
    });

    await prisma.activity.create({
      data: {
        type: 'GROUP_CREATED',
        userId: data.createdById,
        groupId: group.id,
        metadata: { name: data.name },
      },
    });

    return group;
  },

  async getUserGroups(userId: string) {
    const groups = await prisma.group.findMany({
      where: {
        isArchived: false,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return groups;
  },

  async getGroupById(groupId: string, userId: string) {
    const group = await prisma.group.findFirst({
      where: {
        id: groupId,
        isArchived: false,
        members: { some: { userId } },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, avatarUrl: true, email: true } } },
        },
        expenses: {
          where: { isDeleted: false },
          take: 20,
          orderBy: [
            { date: 'desc' },
            { createdAt: 'desc' }
          ],
          include: {
            payer: { select: { id: true, name: true, avatarUrl: true } },
            splits: {
              include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            },
          },
        },
      },
    });

    if (!group) throw createError('Group not found', 404);
    return group;
  },

  async addMember(groupId: string, userId: string, newMemberEmail: string) {
    const group = await prisma.group.findFirst({
      where: { id: groupId, members: { some: { userId, role: 'ADMIN' } } },
    });

    if (!group) throw createError('Group not found or not authorized', 403);

    const newUser = await prisma.user.findUnique({ where: { email: newMemberEmail } });
    if (!newUser) throw createError('User with that email not found', 404);

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: newUser.id } },
    });
    if (existing) throw createError('User is already a member', 409);

    await prisma.groupMember.create({
      data: { groupId, userId: newUser.id, role: 'MEMBER' },
    });

    await prisma.activity.create({
      data: {
        type: 'GROUP_MEMBER_ADDED',
        userId,
        groupId,
        metadata: { memberName: newUser.name, memberEmail: newMemberEmail },
      },
    });

    return newUser;
  },

  async getGroupBalances(groupId: string) {
    const splits = await prisma.expenseSplit.findMany({
      where: {
        expense: { groupId, isDeleted: false },
        isPaid: false,
      },
      include: {
        expense: { select: { payerId: true, title: true } },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const balanceMap: Record<string, Record<string, number>> = {};

    for (const split of splits) {
      const owed = Number(split.owedAmount) - Number(split.paidAmount);
      if (owed <= 0 || split.userId === split.expense.payerId) continue;

      const debtor = split.userId;
      const creditor = split.expense.payerId;

      if (!balanceMap[debtor]) balanceMap[debtor] = {};
      balanceMap[debtor][creditor] = (balanceMap[debtor][creditor] || 0) + owed;
    }

    return balanceMap;
  },
};
