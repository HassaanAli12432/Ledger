import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, UserCheck, UserX, Clock, Users, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '@/lib/api';
import { fmt } from '@/lib/format';

interface FriendEntry {
  friendshipId: string;
  friend: { id: string; name: string; email: string; avatarUrl?: string };
  since: string;
}

interface FriendRequest {
  id: string;
  requester: { id: string; name: string; email: string; avatarUrl?: string };
  createdAt: string;
}

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--gold-muted), var(--bg-tertiary))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700,
      fontSize: size * 0.38, color: 'var(--accent-primary)', flexShrink: 0,
    }}>
      {name?.[0]?.toUpperCase() ?? '?'}
    </div>
  );
}

export default function FriendsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ email: string }>();

  const { data: friends = [] } = useQuery<FriendEntry[]>({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends').then(r => r.data.data),
  });

  const { data: incoming = [] } = useQuery<FriendRequest[]>({
    queryKey: ['friend-requests-in'],
    queryFn: () => api.get('/friends/requests/incoming').then(r => r.data.data),
    refetchInterval: 15000,
  });

  const { data: outgoing = [] } = useQuery<any[]>({
    queryKey: ['friend-requests-out'],
    queryFn: () => api.get('/friends/requests/outgoing').then(r => r.data.data),
  });

  const sendReq = useMutation({
    mutationFn: (d: { email: string }) => api.post('/friends', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friend-requests-out'] }); toast.success('Friend request sent!'); reset(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const accept = useMutation({
    mutationFn: (id: string) => api.patch(`/friends/${id}/accept`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends'] }); qc.invalidateQueries({ queryKey: ['friend-requests-in'] }); toast.success('Friend added!'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const reject = useMutation({
    mutationFn: (id: string) => api.patch(`/friends/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friend-requests-in'] }); toast.success('Request rejected'); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/friends/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['friends'] }); toast.success('Friend removed'); },
  });

  const pendingCount = incoming.length;

  return (
    <div>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <p className="label" style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>Your Network</p>
        <h1 style={{ fontSize: '2.25rem', marginBottom: 0 }}>Friends</h1>
      </div>

      {/* Add Friend */}
      <div className="animate-fade-up delay-1 card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <p className="label" style={{ marginBottom: '0.75rem' }}>Add a Friend</p>
        <form onSubmit={handleSubmit(d => sendReq.mutate(d))} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <input
              {...register('email', { required: true })}
              className="input"
              type="email"
              placeholder="Enter their email address..."
            />
            {errors.email && <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.65rem', color: 'var(--danger)', marginTop: '0.4rem' }}>Valid email required</p>}
          </div>
          <button type="submit" className="btn-gold" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }} disabled={sendReq.isPending}>
            <UserPlus size={14} />
            {sendReq.isPending ? 'Sending...' : 'Send Request'}
          </button>
        </form>
      </div>

      {/* Tabs */}
      <div className="animate-fade-up delay-2" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'friends', label: `Friends (${friends.length})` },
          { key: 'requests', label: `Requests${pendingCount ? ` (${pendingCount})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            style={{
              padding: '0.5rem 1rem',
              border: `1px solid ${tab === t.key ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius)',
              background: tab === t.key ? 'var(--accent-subtle)' : 'transparent',
              color: tab === t.key ? 'var(--accent-primary)' : 'var(--text-muted)',
              fontWeight: 500, letterSpacing: '0.05em',
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Friends List */}
      {tab === 'friends' && (
        <div className="animate-fade-in">
          {friends.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <Users size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>No friends yet</h3>
              <p style={{ fontWeight: 400, color: 'var(--text-muted)' }}>Send a friend request above to start splitting expenses together.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {friends.map((f) => (
                <FriendBalanceCard key={f.friendshipId} entry={f} onRemove={() => remove.mutate(f.friendshipId)} />
              ))}
            </div>
          )}

          {/* Outgoing requests */}
          {outgoing.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <p className="label" style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={12} /> Pending Sent Requests
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {outgoing.map(r => (
                  <div key={r.id} className="card" style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Avatar name={r.receiver?.name ?? '?'} size={32} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 400, color: 'var(--text-primary)', fontSize: '1rem' }}>{r.receiver?.name}</p>
                      <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{r.receiver?.email}</p>
                    </div>
                    <span className="badge badge-gold">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Requests Tab */}
      {tab === 'requests' && (
        <div className="animate-fade-in">
          {incoming.length === 0 ? (
            <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
              <UserCheck size={40} color="var(--text-muted)" style={{ margin: '0 auto 1rem' }} />
              <p style={{ fontWeight: 400, color: 'var(--text-muted)' }}>No pending friend requests.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {incoming.map(r => (
                <div key={r.id} className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <Avatar name={r.requester.name} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 400, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500 }}>{r.requester.name}</p>
                    <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{r.requester.email} · {format(new Date(r.createdAt), 'MMM d')}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.65rem', color: 'var(--danger)', borderColor: 'rgba(192,57,43,0.3)' }}
                      onClick={() => reject.mutate(r.id)}
                      disabled={reject.isPending}
                    >
                      <XCircle size={13} /> Decline
                    </button>
                    <button
                      className="btn-gold"
                      style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                      onClick={() => accept.mutate(r.id)}
                      disabled={accept.isPending}
                    >
                      <CheckCircle size={13} /> Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FriendBalanceCard({ entry, onRemove }: { entry: FriendEntry; onRemove: () => void }) {
  const { data: balance } = useQuery<{ iOwe: number; owedToMe: number; net: number }>({
    queryKey: ['friend-balance', entry.friend.id],
    queryFn: () => api.get(`/friends/balance/${entry.friend.id}`).then(r => r.data.data),
  });

  const net = balance?.net ?? 0;

  return (
    <div className="card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <Avatar name={entry.friend.name} />
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 400, color: 'var(--text-primary)', fontSize: '1.05rem', fontWeight: 500 }}>{entry.friend.name}</p>
        <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>{entry.friend.email}</p>
      </div>

      {/* Balance */}
      <div style={{ textAlign: 'right' }}>
        {balance ? (
          <>
            <p style={{
              fontWeight: 600, fontWeight: 700, fontSize: '1.1rem',
              color: net > 0.01 ? 'var(--success)' : net < -0.01 ? 'var(--danger)' : 'var(--text-muted)',
            }}>
              {net > 0.01 ? `+${fmt(net)}` : net < -0.01 ? fmt(net) : 'Settled'}
            </p>
            <p style={{ fontWeight: 500, letterSpacing: '0.05em', fontSize: '0.6rem', color: 'var(--text-muted)' }}>
              {net > 0.01 ? 'owes you' : net < -0.01 ? 'you owe' : '✓ all clear'}
            </p>
          </>
        ) : (
          <div className="spinner" />
        )}
      </div>

      <button
        onClick={onRemove}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', transition: 'color 0.2s', marginLeft: '0.25rem' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--danger)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
        title="Remove friend"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
