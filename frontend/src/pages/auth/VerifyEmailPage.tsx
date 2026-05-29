import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { BookOpen, Shield, TrendingUp, Zap } from 'lucide-react';

const features = [
  { icon: TrendingUp, text: 'Track shared expenses in real-time' },
  { icon: Shield, text: 'Bank-grade security & encryption' },
  { icon: Zap, text: 'Instant debt simplification' },
];

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      try {
        await api.get(`/auth/verify-email?token=${token}`);
        setStatus('success');
      } catch (err) {
        setStatus('error');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="auth-container">
      {/* Left panel */}
      <div className="auth-panel-left">
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div style={{ width: 40, height: 40, background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={20} color="var(--accent-primary)" />
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>Ledger</span>
          </div>

          <h2 style={{ fontSize: '2.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Finance for teams & friends
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '3rem' }}>
            Track shared expenses, settle balances, and keep everyone on the same page.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {features.map(({ icon: Icon, text }) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textAlign: 'left', background: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                <div style={{ width: 32, height: 32, background: 'var(--bg-secondary)', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={16} color="var(--text-primary)" />
                </div>
                <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-panel-right">
        <div className="animate-fade-up">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Email Verification</h1>
          </div>
          {status === 'loading' && <p>Verifying your email...</p>}
          {status === 'success' && (
            <div>
              <p style={{ color: 'var(--success)', marginBottom: '1.5rem', fontWeight: 500 }}>Your email has been verified successfully!</p>
              <button className="btn-gold" style={{ width: '100%' }} onClick={() => navigate('/login')}>Go to Login</button>
            </div>
          )}
          {status === 'error' && (
            <div>
              <p style={{ color: 'var(--danger)', marginBottom: '1.5rem', fontWeight: 500 }}>Invalid or expired verification token.</p>
              <button className="btn-gold" style={{ width: '100%' }} onClick={() => navigate('/login')}>Go to Login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
