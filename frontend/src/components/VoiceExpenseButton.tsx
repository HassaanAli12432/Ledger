import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mic, MicOff, X, Check, RotateCcw, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { parseVoiceExpense, type ParsedVoiceExpense } from '@/lib/parseVoiceExpense';
import { useAuthStore } from '@/store/auth.store';
import type { User } from '@/types';

type Stage = 'idle' | 'listening' | 'processing' | 'preview';

// Check browser support
const SpeechRecognition =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export default function VoiceExpenseButton() {
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const [stage, setStage] = useState<Stage>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsed, setParsed] = useState<ParsedVoiceExpense | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('OTHER');
  const [editFriendIds, setEditFriendIds] = useState<string[]>([]);
  const recognitionRef = useRef<any>(null);
  const pulseIntervalRef = useRef<any>(null);
  const [pulseScale, setPulseScale] = useState(1);

  // Fetch friends for matching
  const { data: friendsData = [] } = useQuery<{ friend: User }[]>({
    queryKey: ['friends'],
    queryFn: () => api.get('/friends').then((r) => r.data.data),
  });
  const friends = friendsData.map((f) => f.friend);
  const friendNames = friends.map((f) => f.name);

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: (data: object) => api.post('/expenses', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      toast.success('Expense created from voice!');
      resetAll();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create expense'),
  });

  // Pulse animation while listening
  useEffect(() => {
    if (stage === 'listening') {
      pulseIntervalRef.current = setInterval(() => {
        setPulseScale((prev) => (prev === 1 ? 1.2 : 1));
      }, 600);
    } else {
      clearInterval(pulseIntervalRef.current);
      setPulseScale(1);
    }
    return () => clearInterval(pulseIntervalRef.current);
  }, [stage]);

  const resetAll = () => {
    setStage('idle');
    setTranscript('');
    setParsed(null);
    setEditTitle('');
    setEditAmount('');
    setEditCategory('OTHER');
    setEditFriendIds([]);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ok */ }
    }
  };

  const startListening = () => {
    if (!SpeechRecognition) {
      toast.error('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setStage('processing');

      // Parse after a brief delay (for the animation)
      setTimeout(() => {
        const result = parseVoiceExpense(text, friendNames);
        setParsed(result);
        setEditTitle(result.title);
        setEditAmount(result.amount?.toString() || '');
        setEditCategory(result.category);

        // Match friend names to IDs
        const matchedIds = result.friendNames
          .map((name) => friends.find((f) => f.name.toLowerCase() === name.toLowerCase())?.id)
          .filter(Boolean) as string[];
        setEditFriendIds(matchedIds);

        setStage('preview');
      }, 800);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error('No speech detected. Try again.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Check browser permissions.');
      } else {
        toast.error('Speech recognition error. Try again.');
      }
      resetAll();
    };

    recognition.onend = () => {
      if (stage === 'listening') {
        // If we're still in listening stage but recognition ended without result
        // Keep the state so the user can see what happened
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setStage('listening');
  };

  const handleConfirm = () => {
    if (!editAmount || !editTitle) {
      toast.error('Amount and description are required');
      return;
    }

    const amount = Number(editAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Invalid amount');
      return;
    }

    // Build splits: current user + selected friends
    const allUserIds = [user!.id, ...editFriendIds];
    const share = Math.floor(amount / allUserIds.length);
    const remainder = amount - share * allUserIds.length;
    const splits = allUserIds.map((uid, i) => ({
      userId: uid,
      amount: i === 0 ? share + remainder : share,
    }));

    createMutation.mutate({
      title: editTitle,
      amount,
      category: editCategory,
      splitType: 'EQUAL',
      splits,
    });
  };

  const toggleFriend = (friendId: string) => {
    setEditFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const CATEGORIES = ['FOOD', 'TRANSPORT', 'ACCOMMODATION', 'ENTERTAINMENT', 'UTILITIES', 'HEALTHCARE', 'SHOPPING', 'EDUCATION', 'TRAVEL', 'OTHER'];

  // Don't render if speech recognition not supported
  if (!SpeechRecognition) return null;

  return (
    <>
      {/* Floating Mic Button */}
      <button
        id="voice-expense-btn"
        onClick={stage === 'idle' ? startListening : undefined}
        className="voice-fab"
        style={{
          transform: `scale(${pulseScale})`,
          ...(stage !== 'idle' ? { opacity: 0, pointerEvents: 'none' as const } : {}),
        }}
        title="Add expense by voice"
      >
        <Mic size={22} />
      </button>

      {/* Overlay for listening / processing / preview */}
      {stage !== 'idle' && (
        <div className="voice-overlay" onClick={stage === 'listening' ? resetAll : undefined}>
          <div className="voice-modal" onClick={(e) => e.stopPropagation()}>
            {/* LISTENING STATE */}
            {stage === 'listening' && (
              <div className="voice-listening-state">
                <div className="voice-mic-ring">
                  <div className="voice-mic-ring-inner">
                    <Mic size={32} color="var(--accent-primary)" />
                  </div>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  Listening...
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Say something like "2000 split with Ahmed for dinner"
                </p>
                <button onClick={resetAll} className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
                  <MicOff size={14} /> Cancel
                </button>
              </div>
            )}

            {/* PROCESSING STATE */}
            {stage === 'processing' && (
              <div className="voice-listening-state">
                <Loader2 size={40} className="voice-spinner" color="var(--accent-primary)" />
                <h2 style={{ fontSize: '1.3rem', fontWeight: 600, marginTop: '1rem', marginBottom: '0.5rem' }}>
                  Processing...
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  "{transcript}"
                </p>
              </div>
            )}

            {/* PREVIEW STATE */}
            {stage === 'preview' && parsed && (
              <div>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={16} color="var(--accent-primary)" />
                    <p className="label" style={{ color: 'var(--accent-primary)', margin: 0 }}>Voice Expense</p>
                  </div>
                  <button onClick={resetAll} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem' }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Transcript */}
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>You said</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', fontWeight: 500, fontStyle: 'italic' }}>"{transcript}"</p>
                </div>

                {/* Confidence */}
                {parsed.confidence < 0.5 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.625rem 0.875rem', background: 'rgba(230,126,34,0.1)', border: '1px solid rgba(230,126,34,0.25)', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem' }}>
                    <AlertCircle size={14} color="var(--warning, #E67E22)" />
                    <p style={{ fontSize: '0.75rem', color: 'var(--warning, #E67E22)', fontWeight: 500 }}>Low confidence — please verify all fields below</p>
                  </div>
                )}

                {/* Editable Fields */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  {/* Amount */}
                  <div>
                    <label className="label">Amount (PKR)</label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.875rem', color: 'var(--accent-primary)', pointerEvents: 'none', fontWeight: 600 }}>Rs.</span>
                      <input
                        className="input"
                        type="number"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        style={{ paddingLeft: '3rem', fontSize: '1.1rem', fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="label">Description</label>
                    <input className="input" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="label">Category</label>
                    <select className="input" value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ cursor: 'pointer' }}>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Friends */}
                  <div>
                    <label className="label">Split With</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {friends.map((f) => {
                        const isSelected = editFriendIds.includes(f.id);
                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => toggleFriend(f.id)}
                            style={{
                              padding: '0.375rem 0.75rem',
                              border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--border-medium)'}`,
                              borderRadius: '999px',
                              background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                              color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              fontSize: '0.8rem',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                          >
                            {f.name}
                          </button>
                        );
                      })}
                      {friends.length === 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No friends added yet</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => { resetAll(); setTimeout(startListening, 200); }} className="btn-ghost" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <RotateCcw size={14} /> Try Again
                  </button>
                  <button
                    onClick={handleConfirm}
                    className="btn-gold"
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    disabled={createMutation.isPending || !editAmount || !editTitle}
                  >
                    {createMutation.isPending ? <Loader2 size={14} className="voice-spinner" /> : <Check size={14} />}
                    {createMutation.isPending ? 'Creating...' : 'Create Expense'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
