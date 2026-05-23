import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Plus, Receipt, Trash2, Pencil, X, Search, Filter, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Expense } from '@/types';
import AddExpenseModal from '@/components/modals/AddExpenseModal';
import { useAuthStore } from '@/store/auth.store';
import { fmt } from '@/lib/format';

const categoryColors: Record<string, string> = {
  FOOD: 'var(--accent-primary)', TRANSPORT: '#3498DB', ACCOMMODATION: '#9B59B6',
  ENTERTAINMENT: '#E91E63', UTILITIES: '#16A085', OTHER: '#7F8C8D',
  HEALTHCARE: '#E74C3C', SHOPPING: '#8E44AD', EDUCATION: '#2980B9', TRAVEL: '#27AE60',
};

const CATEGORIES = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'UTILITIES', 'HEALTHCARE', 'SHOPPING', 'EDUCATION', 'TRAVEL', 'OTHER'];

// Edit Expense Modal
function EditExpenseModal({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      title: expense.title,
      description: expense.description || '',
      category: expense.category,
      date: new Date(expense.date).toISOString().split('T')[0],
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: object) => api.patch(`/expenses/${expense.id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Expense updated');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to update'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding: 0, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.75rem 2rem 1.25rem', borderBottom: '1px solid var(--border-medium)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>Edit Entry</p>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Update Expense</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1rem 2rem 0', background: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-medium)' }}>
          <p className="label" style={{ marginBottom: '0.25rem' }}>Amount</p>
          <p style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--accent-primary)', marginBottom: '0.75rem' }}>
            {fmt(expense.amount)}
          </p>
          <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)', paddingBottom: '0.75rem' }}>
            Amount & splits cannot be changed. Delete and re-add if needed.
          </p>
        </div>

        <form onSubmit={handleSubmit(d => mutate(d))}>
          <div style={{ padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Description</label>
              <input {...register('title', { required: 'Title is required' })} className="input" />
              {errors.title && <p style={{ fontWeight: 500, fontSize: '0.65rem', color: 'var(--danger)', marginTop: '0.4rem' }}>{errors.title.message}</p>}
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input {...register('description')} className="input" placeholder="Add a note..." />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label className="label">Category</label>
                <select {...register('category')} className="input" style={{ cursor: 'pointer' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Date</label>
                <input {...register('date')} className="input" type="date" />
              </div>
            </div>
          </div>
          <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid var(--border-medium)', display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex: 2 }} disabled={isPending}>
              {isPending ? <span className="spinner" style={{ margin: '0 auto' }} /> : 'Save Changes →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpensesPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);

  const buildQueryString = () => {
    const params = new URLSearchParams({ limit: '50' });
    if (searchText.trim()) params.set('search', searchText.trim());
    if (filterCategory) params.set('category', filterCategory);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  };

  const { data, isLoading } = useQuery<{ expenses: Expense[] }>({
    queryKey: ['expenses', searchText, filterCategory, dateFrom, dateTo],
    queryFn: () => api.get(`/expenses?${buildQueryString()}`).then(r => ({ expenses: r.data.expenses ?? [] })),
  });

  const expenses = data?.expenses ?? [];

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Delete "${expense.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/expenses/${expense.id}`);
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['debts'] });
      toast.success('Expense deleted');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('from', dateFrom);
      if (dateTo) params.set('to', dateTo);
      const response = await api.get(`/export/expenses?${params.toString()}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Expenses exported!');
    } catch {
      toast.error('Export failed');
    }
  };

  const isPayer = (e: Expense) => e.payerId === user?.id || e.payer?.id === user?.id;
  const hasActiveFilters = searchText || filterCategory || dateFrom || dateTo;

  const clearFilters = () => {
    setSearchText('');
    setFilterCategory('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Financial Record</p>
          <h1 style={{ fontSize: '2.25rem', marginBottom: 0 }}>Expenses</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginTop: '0.25rem' }}>
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}{hasActiveFilters ? ' (filtered)' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'Filters'}
            {hasActiveFilters && <div style={{ position: 'absolute', top: -2, right: -2, width: 8, height: 8, background: 'var(--accent-primary)', borderRadius: '50%' }} />}
          </button>
          <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleExportCsv}>
            <Download size={14} /> Export CSV
          </button>
          <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Expense
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="filter-bar animate-fade-up">
          <div style={{ position: 'relative', flex: 2, minWidth: 180 }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input className="input" placeholder="Search expenses..." value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
          </div>
          <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} style={{ cursor: 'pointer', minWidth: 130 }}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>)}
          </select>
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" style={{ minWidth: 130 }} />
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" style={{ minWidth: 130 }} />
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost" style={{ padding: '0.5rem 0.75rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--danger)', whiteSpace: 'nowrap' }}>
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : !expenses.length ? (
        <div className="card animate-fade-up" style={{ padding: '4rem', textAlign: 'center' }}>
          <Receipt size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
            {hasActiveFilters ? 'No matching expenses' : 'No expenses yet'}
          </h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first shared expense to get started.'}
          </p>
          {hasActiveFilters ? (
            <button className="btn-ghost" onClick={clearFilters}>Clear Filters</button>
          ) : (
            <button className="btn-gold" onClick={() => setShowAdd(true)}>Add First Expense</button>
          )}
        </div>
      ) : (
        <div className="card animate-fade-up delay-1" style={{ overflow: 'hidden' }}>
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Paid By</th>
                <th>My Share</th>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th style={{ width: 80, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const myShare = e.splits?.find(s => s.userId === user?.id);
                const iOwe = myShare && !myShare.isPaid && e.payerId !== user?.id;
                const canEdit = isPayer(e);
                return (
                  <tr key={e.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: categoryColors[e.category] || '#7F8C8D', flexShrink: 0 }} />
                        <div>
                          <p style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '1rem', marginBottom: 0 }}>{e.title}</p>
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.1rem' }}>
                            <span style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.55rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{e.category}</span>
                            {e.group && <><span style={{ color: 'var(--text-muted)', fontSize: '0.55rem' }}>·</span><span style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.55rem', color: 'var(--accent-primary)', textTransform: 'uppercase' }}>{e.group.name}</span></>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {e.payer?.name}
                      {canEdit && <span style={{ fontWeight: 500, fontSize: '0.55rem', color: 'var(--accent-primary)', marginLeft: '0.4rem' }}>you</span>}
                    </td>
                    <td>
                      {myShare ? (
                        <span className={`badge ${myShare.isPaid ? 'badge-green' : iOwe ? 'badge-red' : 'badge-gold'}`}>
                          {myShare.isPaid ? '✓ Settled' : fmt(myShare.owedAmount)}
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {format(new Date(e.date), 'MMM d, yyyy')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {fmt(e.amount)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                        {canEdit ? (
                          <>
                            <button onClick={() => setEditExpense(e)} title="Edit expense"
                              style={{ background: 'none', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem 0.5rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={el => { el.currentTarget.style.color = 'var(--accent-primary)'; el.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                              onMouseLeave={el => { el.currentTarget.style.color = 'var(--text-muted)'; el.currentTarget.style.borderColor = 'var(--border-medium)'; }}
                            ><Pencil size={13} /></button>
                            <button onClick={() => handleDelete(e)} title="Delete expense"
                              style={{ background: 'none', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.3rem 0.5rem', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                              onMouseEnter={el => { el.currentTarget.style.color = 'var(--danger)'; el.currentTarget.style.borderColor = 'rgba(192,57,43,0.4)'; }}
                              onMouseLeave={el => { el.currentTarget.style.color = 'var(--text-muted)'; el.currentTarget.style.borderColor = 'var(--border-medium)'; }}
                            ><Trash2 size={13} /></button>
                          </>
                        ) : (
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddExpenseModal onClose={() => { setShowAdd(false); qc.invalidateQueries({ queryKey: ['expenses'] }); qc.invalidateQueries({ queryKey: ['balances'] }); }} />
      )}
      {editExpense && (
        <EditExpenseModal expense={editExpense} onClose={() => setEditExpense(null)} />
      )}
    </div>
  );
}
