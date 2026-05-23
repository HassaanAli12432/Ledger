import { useQuery } from '@tanstack/react-query';
import { BarChart3, PieChart, TrendingUp, Calendar } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart as RechartsPie, Pie,
  AreaChart, Area,
} from 'recharts';
import api from '@/lib/api';
import { fmt } from '@/lib/format';

interface CategoryItem { category: string; total: number; }
interface MonthlyItem { month: string; total: number; }
interface SpenderItem { userId: string; name: string; total: number; }
interface WeeklyItem { day: string; average: number; total: number; count: number; }

const CATEGORY_COLORS: Record<string, string> = {
  FOOD: '#5A7BB5', TRANSPORT: '#63B38B', ACCOMMODATION: '#9B7BB5',
  ENTERTAINMENT: '#D66D75', UTILITIES: '#5BB5A6', HEALTHCARE: '#B55A5A',
  SHOPPING: '#8B7BB5', EDUCATION: '#5A9BB5', TRAVEL: '#7BB55A', OTHER: '#8A8D93',
};

const PIE_COLORS = ['#5A7BB5', '#63B38B', '#D66D75', '#9B7BB5', '#5BB5A6', '#B5985A', '#5A9BB5', '#7BB55A', '#B55A5A', '#8A8D93'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)',
      borderRadius: 'var(--radius-sm)', padding: '0.625rem 0.875rem',
      boxShadow: 'var(--shadow-md)', fontSize: '0.8rem',
    }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.25rem' }}>{label}</p>
      <p style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{fmt(payload[0].value)}</p>
    </div>
  );
};

export default function AnalyticsPage() {
  const { data: categoryData = [], isLoading: catLoading } = useQuery<CategoryItem[]>({
    queryKey: ['analytics-category'],
    queryFn: () => api.get('/analytics/category-breakdown').then(r => r.data.data),
  });

  const { data: monthlyData = [], isLoading: monthLoading } = useQuery<MonthlyItem[]>({
    queryKey: ['analytics-monthly'],
    queryFn: () => api.get('/analytics/monthly-trend').then(r => r.data.data),
  });

  const { data: spenderData = [], isLoading: spenderLoading } = useQuery<SpenderItem[]>({
    queryKey: ['analytics-spenders'],
    queryFn: () => api.get('/analytics/top-spenders').then(r => r.data.data),
  });

  const { data: weeklyData = [], isLoading: weekLoading } = useQuery<WeeklyItem[]>({
    queryKey: ['analytics-weekly'],
    queryFn: () => api.get('/analytics/weekly-pattern').then(r => r.data.data),
  });

  const totalSpending = categoryData.reduce((s, c) => s + c.total, 0);

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '2.5rem' }}>
        <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Insights</p>
        <h1 style={{ fontSize: '2.25rem', marginBottom: '0.5rem' }}>Analytics</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Spending patterns and breakdown over the last 6 months
        </p>
      </div>

      {/* Summary stat */}
      <div className="animate-fade-up delay-1" style={{ marginBottom: '2rem' }}>
        <div className="stat-card" style={{ padding: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <p className="label" style={{ marginBottom: '0.5rem' }}>Total Spending (6 months)</p>
            <p style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {catLoading ? '—' : fmt(totalSpending)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <p className="label">Categories</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{categoryData.length}</p>
            </div>
            <div>
              <p className="label">Months</p>
              <p style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{monthlyData.filter(m => m.total > 0).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="analytics-grid animate-fade-up delay-2">
        {/* Monthly Trend */}
        <div className="chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="chart-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <TrendingUp size={14} color="var(--accent-primary)" />
                <p className="label" style={{ margin: 0 }}>Monthly Trend</p>
              </div>
            </div>
          </div>
          {monthLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="var(--accent-primary)" strokeWidth={2} fill="url(#colorArea)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Category Breakdown (Pie) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={14} color="var(--accent-primary)" />
              <p className="label" style={{ margin: 0 }}>By Category</p>
            </div>
          </div>
          {catLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : categoryData.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No data yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RechartsPie>
                  <Pie
                    data={categoryData}
                    dataKey="total"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </RechartsPie>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', marginTop: '0.75rem' }}>
                {categoryData.map((c, i) => (
                  <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: CATEGORY_COLORS[c.category] || PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>
                      {c.category.toLowerCase()}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {fmt(c.total)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Weekly Pattern (Bar) */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Calendar size={14} color="var(--accent-primary)" />
              <p className="label" style={{ margin: 0 }}>Weekly Pattern</p>
            </div>
          </div>
          {weekLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}><div className="spinner" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData} barSize={28}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                  {weeklyData.map((entry, i) => (
                    <Cell key={entry.day} fill={i === weeklyData.findIndex(d => d.average === Math.max(...weeklyData.map(w => w.average))) ? 'var(--accent-primary)' : 'var(--bg-tertiary)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Top Spenders */}
      <div className="animate-fade-up delay-3" style={{ marginTop: '2rem' }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart3 size={14} color="var(--accent-primary)" />
              <p className="label" style={{ margin: 0 }}>Top Spenders</p>
            </div>
          </div>
          {spenderLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
          ) : spenderData.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No data yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {spenderData.map((s, i) => {
                const maxTotal = spenderData[0]?.total || 1;
                const pct = (s.total / maxTotal) * 100;
                return (
                  <div key={s.userId} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, width: 20, textAlign: 'center' }}>
                      {i + 1}
                    </span>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: i === 0 ? 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))' : 'var(--bg-tertiary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700,
                      color: i === 0 ? '#fff' : 'var(--accent-primary)',
                      flexShrink: 0,
                    }}>
                      {s.name[0]?.toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-primary)' }}>{fmt(s.total)}</span>
                      </div>
                      <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: i === 0 ? 'var(--accent-primary)' : 'var(--border-strong)',
                          borderRadius: 2,
                          transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
