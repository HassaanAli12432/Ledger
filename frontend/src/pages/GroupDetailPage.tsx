import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Receipt, TrendingUp } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '@/lib/api';
import type { Group, Expense } from '@/types';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import { fmt } from '@/lib/format';

function AddMemberModal({ groupId, onClose }: { groupId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit } = useForm<{ email: string }>();
  const { mutate, isPending } = useMutation({
    mutationFn: (d: { email: string }) => api.post(`/groups/${groupId}/members`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['group', groupId] }); toast.success('Member added'); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding: '2rem', maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Invite</p>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Add Member</h2>
        <form onSubmit={handleSubmit((d) => mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label className="label">Email Address</label>
            <input {...register('email', { required: true })} className="input" type="email" placeholder="member@example.com" />
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex: 1 }} disabled={isPending}>Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}


const categoryColors: Record<string, string> = {
  FOOD: 'var(--accent-primary)', TRANSPORT: '#3498DB', ACCOMMODATION: '#9B59B6',
  ENTERTAINMENT: '#E91E63', UTILITIES: '#16A085', OTHER: '#7F8C8D',
};

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const qc = useQueryClient();

  const { data: group, isLoading } = useQuery<Group & { expenses: Expense[] }>({
    queryKey: ['group', id],
    queryFn: () => api.get(`/groups/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>;
  if (!group) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>Group not found.</div>;

  return (
    <div>
      {/* Back */}
      <Link to="/groups" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.65rem', letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', marginBottom: '1.5rem', transition: 'color 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-primary)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
      >
        <ArrowLeft size={12} /> All Groups
      </Link>

      {/* Header */}
      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="badge badge-gold" style={{ marginBottom: '0.75rem', display: 'inline-block' }}>{group.type}</span>
          <h1 style={{ fontSize: '2.25rem', marginBottom: '0.25rem' }}>{group.name}</h1>
          {group.description && <p style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '1.05rem' }}>{group.description}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowAddMember(true)}>
            <UserPlus size={14} /> Add Member
          </button>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowAddExpense(true)}>
            <Receipt size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Members */}
      <div className="animate-fade-up delay-1 card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p className="label" style={{ marginBottom: '1rem' }}>Members — {group.members.length}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {group.members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)', border: '1px solid var(--border-medium)', borderRadius: 4, padding: '0.4rem 0.75rem' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-subtle), var(--surface-3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {m.user.name[0].toUpperCase()}
              </div>
              <span style={{ fontWeight: 400, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{m.user.name}</span>
              {m.role === 'ADMIN' && <span className="badge badge-gold" style={{ fontSize: '0.5rem' }}>Admin</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Expenses */}
      <div className="animate-fade-up delay-2">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <Receipt size={14} color="var(--accent-primary)" />
          <p className="label" style={{ margin: 0 }}>Expenses — {group.expenses?.length ?? 0}</p>
        </div>

        {!group.expenses?.length ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
            <p style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '1.1rem' }}>No expenses yet.</p>
            <button className="btn-gold" style={{ marginTop: '1rem' }} onClick={() => setShowAddExpense(true)}>Add First Expense</button>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Expense</th>
                  <th>Paid By</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {group.expenses.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[e.category] || '#7F8C8D', flexShrink: 0 }} />
                        <div>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: 0 }}>{e.title}</p>
                          <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{e.category}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{e.payer?.name}</td>
                    <td style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(e.date), 'MMM d, yyyy')}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontWeight: 700, color: 'var(--accent-primary)' }}>{fmt(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddMember && <AddMemberModal groupId={id!} onClose={() => setShowAddMember(false)} />}
      {showAddExpense && (
        <AddExpenseModal
          groupId={id}
          groupMembers={group.members.map(m => m.user)}
          onClose={() => { setShowAddExpense(false); qc.invalidateQueries({ queryKey: ['group', id] }); }}
        />
      )}
    </div>
  );
}
