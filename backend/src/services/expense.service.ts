// @ts-nocheck
import { Decimal } from '@prisma/client/runtime/library';
import prisma from '../lib/prisma';
import { createError } from '../middleware/error.middleware';

interface DebtEntry {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

// Debt simplification algorithm using net balances
export const simplifyDebts = (debts: DebtEntry[]): DebtEntry[] => {
  const netBalances: Record<string, Record<string, number>> = {};

  for (const debt of debts) {
    if (!netBalances[debt.fromUserId]) netBalances[debt.fromUserId] = {};
    if (!netBalances[debt.toUserId]) netBalances[debt.toUserId] = {};

    netBalances[debt.fromUserId][debt.toUserId] =
      (netBalances[debt.fromUserId][debt.toUserId] || 0) + debt.amount;
  }

  // Net out mutual debts
  const simplified: DebtEntry[] = [];
  const processed = new Set<string>();

  for (const from of Object.keys(netBalances)) {
    for (const to of Object.keys(netBalances[from] || {})) {
      const key = [from, to].sort().join('-');
      if (processed.has(key)) continue;
      processed.add(key);

      const forwardDebt = netBalances[from]?.[to] || 0;
      const backwardDebt = netBalances[to]?.[from] || 0;
      const net = forwardDebt - backwardDebt;

      if (net > 0.01) simplified.push({ fromUserId: from, toUserId: to, amount: net });
      else if (net < -0.01) simplified.push({ fromUserId: to, toUserId: from, amount: -net });
    }
  }

  return simplified;
};

export const expenseService = {
  async createExpense(data: {
    title: string;
    description?: string;
    amount: number;
    currency?: string;
    category?: string;
    payerId: string;
    groupId?: string;
    splitType?: string;
    date?: Date;
    splits: { userId: string; amount: number }[];
  }) {
    const { splits, ...expenseData } = data;

    // Validate splits sum
    const splitsSum = splits.reduce((sum, s) => sum + s.amount, 0);
    if (Math.abs(splitsSum - data.amount) > 0.01) {
      throw createError('Splits must sum to the total expense amount', 400);
    }

    const expense = await prisma.expense.create({
      data: {
        ...expenseData,
        amount: new Decimal(data.amount),
        splits: {
          create: splits.map((s) => ({
            userId: s.userId,
            owedAmount: new Decimal(s.amount),
            isPaid: s.userId === data.payerId,
            paidAmount: s.userId === data.payerId ? new Decimal(s.amount) : new Decimal(0),
          })),
        },
      } as any,
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
        },
        group: { select: { id: true, name: true } },
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'EXPENSE_CREATED',
        userId: data.payerId,
        groupId: data.groupId,
        expenseId: expense.id,
        metadata: { title: data.title, amount: data.amount },
      },
    });

    return expense;
  },

  async getExpenses(
    userId: string,
    filters: {
      groupId?: string;
      search?: string;
      category?: string;
      dateFrom?: string;
      dateTo?: string;
      minAmount?: number;
      maxAmount?: number;
    } = {},
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;

    const where: any = filters.groupId
      ? { groupId: filters.groupId, isDeleted: false }
      : {
          isDeleted: false,
          OR: [
            { payerId: userId },
            { splits: { some: { userId } } },
          ],
        };

    // Search filter — match title
    if (filters.search) {
      where.title = { contains: filters.search, mode: 'insensitive' };
    }

    // Category filter
    if (filters.category) {
      where.category = filters.category;
    }

    // Date range filter
    if (filters.dateFrom || filters.dateTo) {
      where.date = {};
      if (filters.dateFrom) where.date.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.date.lte = new Date(filters.dateTo);
    }

    // Amount range filter
    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {};
      if (filters.minAmount !== undefined) where.amount.gte = filters.minAmount;
      if (filters.maxAmount !== undefined) where.amount.lte = filters.maxAmount;
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { date: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          payer: { select: { id: true, name: true, avatarUrl: true } },
          splits: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          group: { select: { id: true, name: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.expense.count({ where }),
    ]);

    return {
      expenses,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getExpenseById(id: string, userId: string) {
    const expense = await prisma.expense.findFirst({
      where: {
        id,
        isDeleted: false,
        OR: [{ payerId: userId }, { splits: { some: { userId } } }],
      },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        splits: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        },
        group: { select: { id: true, name: true } },
        comments: {
          include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!expense) throw createError('Expense not found', 404);
    return expense;
  },

  async updateExpense(
    id: string,
    userId: string,
    data: { title?: string; description?: string; category?: string; date?: Date }
  ) {
    const expense = await prisma.expense.findFirst({
      where: { id, payerId: userId, isDeleted: false },
    });
    if (!expense) throw createError('Expense not found or not authorized', 404);

    return prisma.expense.update({
      where: { id },
      data: {
        ...(data.title && { title: data.title }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category as any }),
        ...(data.date && { date: data.date }),
      },
      include: {
        payer: { select: { id: true, name: true, avatarUrl: true } },
        splits: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
        group: { select: { id: true, name: true } },
      },
    });
  },

  async deleteExpense(id: string, userId: string) {
    const expense = await prisma.expense.findFirst({
      where: { id, isDeleted: false },
    });
    if (!expense) throw createError('Expense not found', 404);
    if (expense.payerId !== userId) throw createError('Only the payer can delete this expense', 403);

    await prisma.expense.update({
      where: { id },
      data: { isDeleted: true },
    });

    await prisma.activity.create({
      data: {
        type: 'EXPENSE_DELETED',
        userId,
        groupId: expense.groupId || undefined,
        expenseId: expense.id,
        metadata: { title: expense.title, amount: Number(expense.amount) },
      },
    });
  },

  async getUserBalances(userId: string) {
    // To properly show "You owe" and "You are owed" without overlapping mutual debts,
    // we must first net the balances per friend, just like getMyDebts does.
    
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
        expense: true,
      },
    });

    const balanceMap: Record<string, { youOwe: number; theyOwe: number }> = {};

    for (const split of splits) {
      const owed = Number(split.owedAmount) - Number(split.paidAmount);
      if (owed <= 0.005) continue;

      if (split.userId === userId && split.expense.payerId !== userId) {
        // I owe the payer
        const payerId = split.expense.payerId;
        if (!balanceMap[payerId]) balanceMap[payerId] = { youOwe: 0, theyOwe: 0 };
        balanceMap[payerId].youOwe += owed;
      } else if (split.expense.payerId === userId && split.userId !== userId) {
        // They owe me
        const debtorId = split.userId;
        if (!balanceMap[debtorId]) balanceMap[debtorId] = { youOwe: 0, theyOwe: 0 };
        balanceMap[debtorId].theyOwe += owed;
      }
    }

    let totalYouOwe = 0;
    let totalYouAreOwed = 0;

    for (const friendId in balanceMap) {
      const net = balanceMap[friendId].theyOwe - balanceMap[friendId].youOwe;
      if (net > 0) {
        totalYouAreOwed += net;
      } else if (net < 0) {
        totalYouOwe += Math.abs(net);
      }
    }

    return {
      youOwe: totalYouOwe,
      youAreOwed: totalYouAreOwed,
      netBalance: totalYouAreOwed - totalYouOwe,
    };
  },
};
