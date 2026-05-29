import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BookOpen, Shield, TrendingUp, Zap } from 'lucide-react';
import api from '@/lib/api';

const schema = z.object({
  email: z.string().email('Invalid email'),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: TrendingUp, text: 'Track shared expenses in real-time' },
  { icon: Shield, text: 'Bank-grade security & encryption' },
  { icon: Zap, text: 'Instant debt simplification' },
];

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', data);
      setSubmitted(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Reset Password</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Enter your email to receive a reset link.
            </p>
          </div>

          {submitted ? (
            <div>
              <p style={{ color: 'var(--success)', marginBottom: '1.5rem', fontWeight: 500 }}>
                If an account exists, a reset email has been sent to your inbox.
              </p>
              <Link to="/login" className="btn-gold" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                Return to Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label className="label">Email Address</label>
                <input {...register('email')} className="input" type="email" placeholder="you@example.com" />
                {errors.email && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.email.message}</p>}
              </div>

              <button type="submit" className="btn-gold" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
                {loading ? <span className="spinner" /> : 'Send Reset Link'}
              </button>
              
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: '1rem' }}>
                Remember your password?{' '}
                <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
