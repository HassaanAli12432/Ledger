import prisma from '../lib/prisma';

export const analyticsService = {
  /**
   * Get spending breakdown by category for the current user
   */
  async getCategoryBreakdown(userId: string, months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        date: { gte: since },
        OR: [
          { payerId: userId },
          { splits: { some: { userId } } },
        ],
      },
      select: { category: true, amount: true },
    });

    const breakdown: Record<string, number> = {};
    for (const e of expenses) {
      const cat = e.category;
      breakdown[cat] = (breakdown[cat] || 0) + Number(e.amount);
    }

    return Object.entries(breakdown)
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);
  },

  /**
   * Get monthly spending trend (last N months)
   */
  async getMonthlyTrend(userId: string, months = 6) {
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        date: { gte: since },
        OR: [
          { payerId: userId },
          { splits: { some: { userId } } },
        ],
      },
      select: { date: true, amount: true },
      orderBy: { date: 'asc' },
    });

    // Group by month
    const trend: Record<string, number> = {};
    for (const e of expenses) {
      const d = new Date(e.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      trend[key] = (trend[key] || 0) + Number(e.amount);
    }

    // Fill in missing months
    const result: { month: string; total: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      result.push({ month: label, total: trend[key] || 0 });
    }

    return result;
  },

  /**
   * Get top spenders (who paid the most) in a group or globally
   */
  async getTopSpenders(userId: string, groupId?: string, limit = 5) {
    const where: any = {
      isDeleted: false,
    };

    if (groupId) {
      where.groupId = groupId;
    } else {
      where.OR = [
        { payerId: userId },
        { splits: { some: { userId } } },
      ];
    }

    const expenses = await prisma.expense.findMany({
      where,
      select: {
        amount: true,
        payer: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const spenderMap: Record<string, { name: string; avatarUrl: string | null; total: number }> = {};
    for (const e of expenses) {
      const p = e.payer;
      if (!spenderMap[p.id]) {
        spenderMap[p.id] = { name: p.name, avatarUrl: p.avatarUrl, total: 0 };
      }
      spenderMap[p.id].total += Number(e.amount);
    }

    return Object.entries(spenderMap)
      .map(([id, data]) => ({ userId: id, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);
  },

  /**
   * Get weekly spending pattern (day-of-week average)
   */
  async getWeeklyPattern(userId: string) {
    const since = new Date();
    since.setMonth(since.getMonth() - 3);

    const expenses = await prisma.expense.findMany({
      where: {
        isDeleted: false,
        date: { gte: since },
        OR: [
          { payerId: userId },
          { splits: { some: { userId } } },
        ],
      },
      select: { date: true, amount: true },
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const totals = new Array(7).fill(0);
    const counts = new Array(7).fill(0);

    for (const e of expenses) {
      const dow = new Date(e.date).getDay();
      totals[dow] += Number(e.amount);
      counts[dow]++;
    }

    return days.map((day, i) => ({
      day,
      average: counts[i] > 0 ? Math.round(totals[i] / counts[i]) : 0,
      total: totals[i],
      count: counts[i],
    }));
  },
};
