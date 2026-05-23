import { useQuery } from '@tanstack/react-query';
import { TrendingDown, TrendingUp, Minus, Plus, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import api from '@/lib/api';
import type { Balances, Activity } from '@/types';
import { format } from 'date-fns';
import { fmt } from '@/lib/format';

const activityLabel: Record<string, string> = {
  EXPENSE_CREATED: 'Expense added',
  EXPENSE_DELETED: 'Expense removed',
  SETTLEMENT_CREATED: 'Settlement recorded',
  GROUP_CREATED: 'Group created',
  GROUP_MEMBER_ADDED: 'Member added',
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: balances, isLoading: balLoading } = useQuery<Balances>({
    queryKey: ['balances'],
    queryFn: () => api.get('/expenses/balances').then((r) => r.data.data),
  });

  const { data: activities, isLoading: actLoading } = useQuery<Activity[]>({
    queryKey: ['activities'],
    queryFn: () => api.get('/users/me/activities?limit=8').then((r) => r.data.data),
  });

  const net = balances?.netBalance ?? 0;

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '3.5rem', marginTop: '1rem' }}>
        <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
          {format(new Date(), 'EEEE, MMMM d yyyy')}
        </p>
        <h1 style={{ fontSize: '2.5rem', marginBottom: 0, fontWeight: 600 }}>Good {getGreeting()}, {user?.name?.split(' ')[0]}.</h1>
      </div>

      {/* Hero Balance */}
      <div className="animate-fade-up delay-1 card" style={{ padding: '3.5rem', marginBottom: '2rem', position: 'relative', overflow: 'hidden', background: 'linear-gradient(145deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)', border: '1px solid var(--border-medium)' }}>
        <div style={{ position: 'absolute', right: -100, top: -100, width: 400, height: 400, background: 'radial-gradient(circle, var(--accent-subtle) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        <p className="label" style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>Net Balance</p>
        {balLoading ? (
          <div style={{ height: 80, display: 'flex', alignItems: 'center' }}><div className="spinner" /></div>
        ) : (
          <>
            <p className="amount-display" style={{ fontSize: 'clamp(3.5rem, 8vw, 6rem)', lineHeight: 1, display: 'block', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
              {fmt(Math.abs(net))}
            </p>
            <p style={{ fontSize: '0.875rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: net >= 0 ? 'var(--success)' : 'var(--danger)', marginTop: '1.25rem' }}>
              {net > 0.01 ? '▲ You are owed' : net < -0.01 ? '▼ You owe' : '◆ All settled up'}
            </p>
          </>
        )}
      </div>

      {/* Stat Cards */}
      <div className="animate-fade-up delay-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <p className="label">You Are Owed</p>
            <TrendingUp size={18} color="var(--success)" opacity={0.8} />
          </div>
          <p style={{ fontWeight: 600, fontSize: '2rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {balLoading ? '—' : fmt(balances?.youAreOwed ?? 0)}
          </p>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <p className="label">You Owe</p>
            <TrendingDown size={18} color="var(--danger)" opacity={0.8} />
          </div>
          <p style={{ fontWeight: 600, fontSize: '2rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            {balLoading ? '—' : fmt(balances?.youOwe ?? 0)}
          </p>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <p className="label">Status</p>
            <Minus size={18} color="var(--accent-primary)" opacity={0.8} />
          </div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '0.05em', color: net >= 0 ? 'var(--success)' : 'var(--danger)', paddingTop: '0.5rem' }}>
            {net > 0.01 ? 'IN CREDIT' : net < -0.01 ? 'IN DEBT' : 'BALANCED'}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="animate-fade-up delay-3" style={{ display: 'flex', gap: '1rem', marginBottom: '3.5rem', flexWrap: 'wrap' }}>
        <Link to="/expenses" style={{ textDecoration: 'none' }}>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} /> Add Expense
          </button>
        </Link>
        <Link to="/settlements" style={{ textDecoration: 'none' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={16} /> Settle Up
          </button>
        </Link>
      </div>

      {/* Activity Feed */}
      <div className="animate-fade-up delay-4">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Clock size={16} color="var(--accent-primary)" />
          <p className="label" style={{ margin: 0 }}>Recent Activity</p>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          {actLoading ? (
            <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
          ) : !activities?.length ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No activity yet. Add your first expense!</p>
            </div>
          ) : (
            <div>
              {activities.map((a, i) => (
                <div key={a.id} style={{ padding: '1.25rem 2rem', borderBottom: i < activities.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-tertiary)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent-primary)', marginBottom: '0.375rem' }}>
                      {activityLabel[a.type] || a.type}
                    </p>
                    <p style={{ color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500 }}>
                      {a.expense?.title || a.group?.name || `Rs. ${a.settlement?.amount}`}
                    </p>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {format(new Date(a.createdAt), 'MMM d')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
