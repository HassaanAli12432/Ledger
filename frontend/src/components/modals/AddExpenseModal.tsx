import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calculator, Equal, Percent } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { User, Group } from '@/types';
import { useAuthStore } from '@/store/auth.store';

type SplitType = 'EQUAL' | 'EXACT' | 'PERCENTAGE';

interface FormData {
  title: string;
  amount: number;
  category: string;
  date: string;
  splitType: SplitType;
  splits: { userId: string; name: string; amount: number }[];
}

interface Props {
  groupId?: string;
  groupMembers?: User[];
  onClose: () => void;
}

const CATEGORIES = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'UTILITIES', 'HEALTHCARE', 'SHOPPING', 'EDUCATION', 'TRAVEL', 'OTHER'];

const splitIcons: Record<SplitType, React.ReactNode> = {
  EQUAL: <Equal size={14} />,
  EXACT: <Calculator size={14} />,
  PERCENTAGE: <Percent size={14} />,
};

export default function AddExpenseModal({ groupId, groupMembers, onClose }: Props) {
  const qc = useQueryClient();
  const user = useAuthStore(s => s.user);
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  
  // Use prefix to distinguish between group and friend
  const [selectedTarget, setSelectedTarget] = useState(groupId ? `group-${groupId}` : '');

  const { data: groups = [] } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(r => r.data.data),
    enabled: !groupId,
  });

  const { data: friends = [] } = useQuery<{ friend: User }[]>({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends').then(r => r.data.data),
    enabled: !groupId,
  });

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      category: 'OTHER',
      date: new Date().toISOString().split('T')[0],
      splitType: 'EQUAL',
      splits: user ? [{ userId: user.id, name: user.name, amount: 0 }] : [],
    },
  });

  const { fields, replace } = useFieldArray({ control, name: 'splits' });
  const totalAmount = Number(watch('amount') || 0);

  // Populate members when target is selected
  useEffect(() => {
    let allMembers = user ? [user] : [];

    if (groupMembers) {
      allMembers = groupMembers;
    } else if (selectedTarget.startsWith('group-')) {
      const gId = selectedTarget.replace('group-', '');
      const gMembers = groups.find(g => g.id === gId)?.members?.map(m => m.user) || [];
      if (gMembers.length) allMembers = gMembers;
    } else if (selectedTarget.startsWith('friend-')) {
      const fId = selectedTarget.replace('friend-', '');
      const friend = friends.find(f => f.friend.id === fId)?.friend;
      if (friend && user) allMembers = [user, friend];
    }

    const unique = Array.from(new Map(allMembers.map(u => [u.id, u])).values());

    if (splitType === 'EQUAL' && totalAmount > 0) {
      // In PKR, we typically avoid decimals. We'll round down to whole numbers and add remainder to payer.
      const share = Math.floor(totalAmount / unique.length);
      const remainder = totalAmount - (share * unique.length);
      
      replace(unique.map((u, i) => ({ 
        userId: u.id, 
        name: u.name, 
        amount: i === 0 ? share + remainder : share 
      })));
    } else {
      replace(unique.map(u => ({ userId: u.id, name: u.name, amount: 0 })));
    }
  }, [selectedTarget, groupMembers, splitType, totalAmount, groups, friends, user, replace]);

  const { mutate, isPending } = useMutation({
    mutationFn: (data: object) => api.post('/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Expense added');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to add expense'),
  });

  const onSubmit = (data: FormData) => {
    let finalSplits = [...data.splits];

    if (splitType === 'PERCENTAGE') {
      let allocated = 0;
      finalSplits = data.splits.map((s, i) => {
        const rawAmount = Math.floor((Number(data.amount) * Number(s.amount)) / 100);
        allocated += rawAmount;
        return { userId: s.userId, amount: rawAmount };
      });
      // Add any rounding remainder to the first person
      const remainder = Number(data.amount) - allocated;
      if (remainder !== 0 && finalSplits.length > 0) {
        finalSplits[0].amount += remainder;
      }
    } else {
      finalSplits = data.splits.map(s => ({ userId: s.userId, amount: Number(s.amount) }));
      
      // Ensure EXACT splits sum exactly to totalAmount
      if (splitType === 'EXACT') {
        const sum = finalSplits.reduce((acc, s) => acc + s.amount, 0);
        if (Math.abs(sum - Number(data.amount)) > 0.01) {
          toast.error(`Splits sum to ${sum}, but total is ${data.amount}. Please adjust.`);
          return;
        }
      }
    }

    mutate({
      title: data.title,
      amount: Number(data.amount),
      category: data.category,
      groupId: selectedTarget.startsWith('group-') ? selectedTarget.replace('group-', '') : undefined,
      date: data.date,
      splitType,
      splits: finalSplits,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.25rem' }}>New Entry</p>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 0 }}>Add Expense</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '65vh', overflowY: 'auto' }}>
            {/* Title */}
            <div>
              <label className="label">Description</label>
              <input {...register('title', { required: true })} className="input" placeholder="Dinner, Uber, Groceries..." />
              {errors.title && <p style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 500 }}>Required</p>}
            </div>

            {/* Amount */}
            <div>
              <label className="label">Total Amount (PKR)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: 'var(--accent-primary)', pointerEvents: 'none', fontWeight: 600 }}>Rs.</span>
                <input
                  {...register('amount', { required: true, min: 0.01 })}
                  className="input"
                  type="number"
                  step="1"
                  placeholder="0"
                  style={{ paddingLeft: '3rem', fontSize: '1rem', fontWeight: 500 }}
                />
              </div>
            </div>

            {/* Category + Date */}
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

            {/* Group or Friend */}
            {!groupId && (
              <div>
                <label className="label">With you and (optional)</label>
                <select
                  className="input"
                  style={{ cursor: 'pointer' }}
                  value={selectedTarget}
                  onChange={e => setSelectedTarget(e.target.value)}
                >
                  <option value="">Personal (no one else)</option>
                  
                  {groups.length > 0 && (
                    <optgroup label="Groups">
                      {groups.map(g => <option key={`group-${g.id}`} value={`group-${g.id}`}>{g.name}</option>)}
                    </optgroup>
                  )}
                  
                  {friends.length > 0 && (
                    <optgroup label="Friends">
                      {friends.map(f => <option key={`friend-${f.friend.id}`} value={`friend-${f.friend.id}`}>{f.friend.name}</option>)}
                    </optgroup>
                  )}
                </select>
              </div>
            )}

            {/* Split Type */}
            <div>
              <label className="label">Split Method</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['EQUAL', 'EXACT', 'PERCENTAGE'] as SplitType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSplitType(t)}
                    style={{
                      flex: 1,
                      padding: '0.625rem',
                      border: `1px solid ${splitType === t ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                      borderRadius: 'var(--radius-sm)',
                      background: splitType === t ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
                      color: splitType === t ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      boxShadow: splitType === t ? '0 0 0 1px var(--accent-primary)' : 'none'
                    }}
                  >
                    {splitIcons[t]} {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Splits */}
            {fields.length > 0 && (
              <div>
                <label className="label">Split Amounts</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {fields.map((field, i) => (
                    <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.625rem 1rem' }}>
                        {field.name}
                        {field.userId === user?.id && <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', marginLeft: '0.5rem', fontWeight: 600 }}>you</span>}
                      </div>
                      <input
                        {...register(`splits.${i}.amount`, { valueAsNumber: true })}
                        className="input"
                        type="number"
                        step="0.01"
                        style={{ width: 110, textAlign: 'right' }}
                        readOnly={splitType === 'EQUAL'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '0.75rem', background: 'var(--bg-tertiary)', borderBottomLeftRadius: 'var(--radius-lg)', borderBottomRightRadius: 'var(--radius-lg)' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex: 2 }} disabled={isPending}>
              {isPending ? <span className="spinner" /> : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
