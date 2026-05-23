import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Users, ChevronRight, Home, Plane, Heart, MoreHorizontal } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { Group } from '@/types';

const groupTypeIcon: Record<string, React.ReactNode> = {
  HOME: <Home size={16} />,
  TRIP: <Plane size={16} />,
  COUPLE: <Heart size={16} />,
  OTHER: <Users size={16} />,
};

function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string; description?: string; type: string }>();

  const { mutate, isPending } = useMutation({
    mutationFn: (data: object) => api.post('/groups', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created');
      onClose();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>New Group</p>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '2rem' }}>Create a Group</h2>

        <form onSubmit={handleSubmit((d) => mutate(d))} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="label">Group Name</label>
            <input {...register('name', { required: true })} className="input" placeholder="Apartment, Summer Trip..." />
            {errors.name && <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.65rem', color: 'var(--danger)', marginTop: '0.4rem' }}>Required</p>}
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <input {...register('description')} className="input" placeholder="A brief description..." />
          </div>

          <div>
            <label className="label">Type</label>
            <select {...register('type')} className="input" style={{ cursor: 'pointer' }}>
              <option value="OTHER">General</option>
              <option value="HOME">Home / Apartment</option>
              <option value="TRIP">Trip / Travel</option>
              <option value="COUPLE">Couple</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
            <button type="button" onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancel</button>
            <button type="submit" className="btn-gold" style={{ flex: 1 }} disabled={isPending}>
              {isPending ? <span className="spinner" style={{ margin: '0 auto' }} /> : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GroupsPage() {
  const [showCreate, setShowCreate] = useState(false);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(r => r.data.data),
  });

  return (
    <div>
      <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Shared Spaces</p>
          <h1 style={{ fontSize: '2.25rem', marginBottom: 0 }}>Groups</h1>
        </div>
        <button className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => setShowCreate(true)}>
          <Plus size={14} /> New Group
        </button>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><div className="spinner" /></div>
      ) : !groups.length ? (
        <div className="card animate-fade-up" style={{ padding: '4rem', textAlign: 'center' }}>
          <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No groups yet</h3>
          <p style={{ fontWeight: 400, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create a group to start splitting expenses with others.</p>
          <button className="btn-gold" onClick={() => setShowCreate(true)}>Create your first group</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {groups.map((g, i) => (
            <Link key={g.id} to={`/groups/${g.id}`} style={{ textDecoration: 'none' }}>
              <div
                className={`card animate-fade-up delay-${Math.min(i + 1, 5)}`}
                style={{ padding: '1.5rem', cursor: 'pointer', transition: 'all 0.25s', display: 'block' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = '';
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-medium)';
                }}
              >
                {/* Group type icon */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ width: 40, height: 40, background: 'var(--accent-subtle)', border: '1px solid var(--border-medium)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                    {groupTypeIcon[g.type] || <Users size={16} />}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </div>

                <h3 style={{ fontWeight: 600, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{g.name}</h3>
                {g.description && <p style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1rem' }}>{g.description}</p>}

                <div className="gold-rule" />

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {g.members?.length ?? 0} member{g.members?.length !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    {g._count?.expenses ?? 0} expense{g._count?.expenses !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}
