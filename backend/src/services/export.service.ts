import prisma from '../lib/prisma';

export const exportService = {
  /**
   * Get expenses data for export
   */
  async getExpensesForExport(userId: string, from?: string, to?: string) {
    const where: any = {
      isDeleted: false,
      OR: [
        { payerId: userId },
        { splits: { some: { userId } } },
      ],
    };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        payer: { select: { name: true } },
        group: { select: { name: true } },
        splits: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { date: 'desc' },
    });

    return expenses;
  },

  /**
   * Get settlements data for export
   */
  async getSettlementsForExport(userId: string) {
    return prisma.settlement.findMany({
      where: {
        OR: [{ fromId: userId }, { toId: userId }],
      },
      include: {
        from: { select: { name: true } },
        to: { select: { name: true } },
        group: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Build CSV string from expenses
   */
  buildExpensesCsv(expenses: any[]): string {
    const headers = ['Date', 'Description', 'Category', 'Amount', 'Currency', 'Paid By', 'Group', 'Split Type', 'Split With'];
    const rows = expenses.map((e) => {
      const splitWith = e.splits
        .map((s: any) => `${s.user.name} (${Number(s.owedAmount).toFixed(0)})`)
        .join('; ');
      return [
        new Date(e.date).toISOString().split('T')[0],
        `"${(e.title || '').replace(/"/g, '""')}"`,
        e.category,
        Number(e.amount).toFixed(2),
        e.currency,
        e.payer?.name || '',
        e.group?.name || 'Personal',
        e.splitType,
        `"${splitWith}"`,
      ].join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  },

  /**
   * Build CSV string from settlements
   */
  buildSettlementsCsv(settlements: any[]): string {
    const headers = ['Date', 'From', 'To', 'Amount', 'Currency', 'Method', 'Status', 'Note', 'Group'];
    const rows = settlements.map((s) => [
      new Date(s.createdAt).toISOString().split('T')[0],
      s.from?.name || '',
      s.to?.name || '',
      Number(s.amount).toFixed(2),
      s.currency,
      s.method,
      s.status,
      `"${(s.note || '').replace(/"/g, '""')}"`,
      s.group?.name || 'N/A',
    ].join(','));

    return [headers.join(','), ...rows].join('\n');
  },
};
