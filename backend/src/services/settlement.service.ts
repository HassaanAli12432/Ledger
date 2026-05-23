import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

export const settlementService = {
  async createSettlement(data: {
    fromId: string;
    toId: string;
    amount: number;
    groupId?: string;
    note?: string;
    method?: string;
  }) {
    if (data.fromId === data.toId) throw createError('Cannot settle with yourself', 400);
    if (data.amount <= 0) throw createError('Amount must be positive', 400);

    // Mark relevant splits as paid
    const unpaidSplits = await prisma.expenseSplit.findMany({
      where: {
        userId: data.fromId,
        isPaid: false,
        expense: {
          payerId: data.toId,
          isDeleted: false,
          ...(data.groupId && { groupId: data.groupId }),
        },
      },
      orderBy: { expense: { date: 'asc' } },
    });

    let remaining = data.amount;
    const updateOps = [];

    for (const split of unpaidSplits) {
      if (remaining <= 0) break;
      const owed = Number(split.owedAmount) - Number(split.paidAmount);
      const paying = Math.min(remaining, owed);
      remaining -= paying;

      updateOps.push(
        prisma.expenseSplit.update({
          where: { id: split.id },
          data: {
            paidAmount: new Decimal(Number(split.paidAmount) + paying),
            isPaid: paying >= owed,
          },
        })
      );
    }

    const [settlement] = await prisma.$transaction([
      prisma.settlement.create({
        data: {
          fromId: data.fromId,
          toId: data.toId,
          amount: new Decimal(data.amount),
          groupId: data.groupId,
          note: data.note,
          method: (data.method as any) || 'CASH',
          status: 'COMPLETED',
        },
        include: {
          from: { select: { id: true, name: true, avatarUrl: true } },
          to: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
      ...updateOps,
    ]);

    await prisma.activity.create({
      data: {
        type: 'SETTLEMENT_CREATED',
        userId: data.fromId,
        groupId: data.groupId,
        settlementId: settlement.id,
        metadata: { amount: data.amount, toUserId: data.toId },
      },
    });

    return settlement;
  },

  async getSettlements(userId: string, groupId?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = {
      OR: [{ fromId: userId }, { toId: userId }],
      ...(groupId && { groupId }),
    };

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          from: { select: { id: true, name: true, avatarUrl: true } },
          to: { select: { id: true, name: true, avatarUrl: true } },
          group: { select: { id: true, name: true } },
        },
      }),
      prisma.settlement.count({ where }),
    ]);

    return {
      settlements,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  },

  // Returns a per-person breakdown of who you owe and who owes you
  async getMyDebts(userId: string) {
    const splits = await prisma.expenseSplit.findMany({
      where: {
        isPaid: false,
        expense: { isDeleted: false },
        OR: [
          { userId },
          { expense: { payerId: userId } },
        ],
      },
      include: {
        expense: {
          include: {
            payer: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Map: personId -> { person, youOwe, theyOwe }
    const balanceMap: Record<string, {
      person: { id: string; name: string; avatarUrl: string | null };
      youOwe: number;
      theyOwe: number;
    }> = {};

    for (const split of splits) {
      const owed = Number(split.owedAmount) - Number(split.paidAmount);
      if (owed <= 0.005) continue;

      if (split.userId === userId && split.expense.payerId !== userId) {
        // I owe the payer
        const payerId = split.expense.payerId;
        if (!balanceMap[payerId]) balanceMap[payerId] = { person: split.expense.payer as any, youOwe: 0, theyOwe: 0 };
        balanceMap[payerId].youOwe += owed;
      } else if (split.expense.payerId === userId && split.userId !== userId) {
        // They owe me
        const debtorId = split.userId;
        if (!balanceMap[debtorId]) balanceMap[debtorId] = { person: split.user as any, youOwe: 0, theyOwe: 0 };
        balanceMap[debtorId].theyOwe += owed;
      }
    }

    return Object.values(balanceMap).map((entry) => ({
      ...entry,
      net: entry.theyOwe - entry.youOwe, // positive = they owe me, negative = I owe them
    }));
  },
};
