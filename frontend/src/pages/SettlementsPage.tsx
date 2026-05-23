import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Plus, TrendingDown, TrendingUp, CheckCircle, Download } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Settlement } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { fmt } from '@/lib/format';

interface DebtEntry {
  person: { id: string; name: string; avatarUrl?: string };
  youOwe: number;
  theyOwe: number;
  net: number;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent-subtle), var(--bg-tertiary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 600, fontWeight: 700,
      fontSize: size * 0.38, color: 'var(--accent-primary)', flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

function SettleModal({ toId, toName, defaultAmount, onClose }: {
  toId: string; toName: string; defaultAmount: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { amount: defaultAmount.toFixed(2), note: '', method: 'CASH' },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (d: any) => api.post('/settlements', { ...d, toId, amount: Number(d.amount) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['friend-balance'] });
      toast.success('Payment recorded!');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding: 0 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid var(--border-medium)' }}>
          <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Record Payment</p>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Settle Up with {toName}</h2>
        </div>

        <form onSubmit={handleSubmit(d => mutate(d))}>
          <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Amount (PKR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--accent-primary)', pointerEvents: 'none' }}>Rs.</span>
                <input {...register('amount', { required: true, min: 1 })} className="input" type="number" step="1" style={{ paddingLeft: '3rem' }} />
              </div>
            </div>

            <div>
              <label className="label">Payment Method</label>
              <select {...register('method')} className="input" style={{ cursor: 'pointer' }}>
                <option value="CASH">Cash</option>
                <option value="JAZZCASH">JazzCash</option>
                <option value="EASYPAISA">Easypaisa</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="label">Note (optional)</label>
              <input {...register('note')} className="input" placeholder="e.g. Paid via JazzCash" />
            </div>
          </div>

          <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-medium)', display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }} disabled={isPending}>
              {isPending ? <span className="spinner" /> : <><CheckCircle size={14} /> Confirm Payment</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SettlementsPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const [settleTarget, setSettleTarget] = useState<{ id: string; name: string; amount: number } | null>(null);

  const { data: debts = [], isLoading: debtsLoading } = useQuery<DebtEntry[]>({
    queryKey: ['debts'],
    queryFn: () => api.get('/settlements/debts').then(r => r.data.data),
  });

  const { data, isLoading: hisLoading } = useQuery<{ settlements: Settlement[] }>({
    queryKey: ['settlements'],
    queryFn: () => api.get('/settlements?limit=30').then(r => ({ settlements: r.data.settlements ?? [] })),
  });

  const settlements = data?.settlements ?? [];
  const iOwe = debts.filter(d => d.youOwe > d.theyOwe);
  const owedToMe = debts.filter(d => d.theyOwe > d.youOwe);

  return (
    <div>
      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Payment Centre</p>
          <h1 style={{ fontSize: '2.25rem', marginBottom: 0 }}>Settle Up</h1>
        </div>
        <button
          className="btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          onClick={async () => {
            try {
              const response = await api.get('/export/settlements', { responseType: 'blob' });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const a = document.createElement('a');
              a.href = url;
              a.download = `settlements_${new Date().toISOString().split('T')[0]}.csv`;
              a.click();
              window.URL.revokeObjectURL(url);
              toast.success('Settlements exported!');
            } catch {
              toast.error('Export failed');
            }
          }}
        >
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* You Owe section */}
      {!debtsLoading && iOwe.length > 0 && (
        <div className="animate-fade-up delay-1" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TrendingDown size={14} color="var(--danger)" />
            <p className="label" style={{ margin: 0, color: 'var(--danger)' }}>You Owe</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {iOwe.map(d => {
              const net = d.youOwe - d.theyOwe;
              return (
                <div key={d.person.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderColor: 'rgba(192,57,43,0.2)' }}>
                  <Avatar name={d.person.name} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 400, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{d.person.name}</p>
                    <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>outstanding balance</p>
                  </div>
                  <p style={{ fontWeight: 600, fontWeight: 700, fontSize: '1.25rem', color: 'var(--danger)' }}>{fmt(net)}</p>
                  <button
                    className="btn-gold"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    onClick={() => setSettleTarget({ id: d.person.id, name: d.person.name, amount: net })}
                  >
                    <CheckCircle size={12} /> Settle Up
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Owed To You section */}
      {!debtsLoading && owedToMe.length > 0 && (
        <div className="animate-fade-up delay-2" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <TrendingUp size={14} color="var(--success)" />
            <p className="label" style={{ margin: 0, color: 'var(--success)' }}>Owed to You</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {owedToMe.map(d => {
              const net = d.theyOwe - d.youOwe;
              return (
                <div key={d.person.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', borderColor: 'rgba(22,160,133,0.2)' }}>
                  <Avatar name={d.person.name} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 400, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{d.person.name}</p>
                    <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>owes you</p>
                  </div>
                  <p style={{ fontWeight: 600, fontWeight: 700, fontSize: '1.25rem', color: 'var(--success)' }}>+{fmt(net)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!debtsLoading && debts.length === 0 && (
        <div className="animate-fade-up delay-1 card" style={{ padding: '3rem', textAlign: 'center', marginBottom: '2rem' }}>
          <CheckCircle size={40} color="var(--success)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>All settled up!</h3>
          <p style={{ fontWeight: 400, color: 'var(--text-muted)' }}>No outstanding balances. Add expenses to start tracking.</p>
        </div>
      )}

      {/* History */}
      <div className="animate-fade-up delay-3">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <p className="label" style={{ margin: 0 }}>Payment History</p>
        </div>

        {hisLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><div className="spinner" /></div>
        ) : settlements.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <p style={{ fontWeight: 400, color: 'var(--text-muted)' }}>No payment history yet.</p>
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>From</th><th></th><th>To</th><th>Method</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {settlements.map(s => {
                  const isPayer = s.fromId === user?.id;
                  return (
                    <tr key={s.id}>
                      <td style={{ fontWeight: 400, color: isPayer ? 'var(--danger)' : 'var(--text-secondary)' }}>{s.from?.name}</td>
                      <td><ArrowRight size={12} color="var(--text-muted)" /></td>
                      <td style={{ fontWeight: 400, color: !isPayer ? 'var(--success)' : 'var(--text-secondary)' }}>{s.to?.name}</td>
                      <td><span className="badge badge-gold">{s.method?.replace('_', ' ')}</span></td>
                      <td style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(s.createdAt), 'MMM d, yyyy')}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontWeight: 700, color: isPayer ? 'var(--danger)' : 'var(--success)' }}>
                        {isPayer ? '-' : '+'}{fmt(s.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {settleTarget && (
        <SettleModal
          toId={settleTarget.id}
          toName={settleTarget.name}
          defaultAmount={settleTarget.amount}
          onClose={() => setSettleTarget(null)}
        />
      )}
    </div>
  );
}
