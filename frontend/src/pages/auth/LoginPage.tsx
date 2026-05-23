import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BookOpen, TrendingUp, Shield, Zap } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(1, 'Password required'),
});
type FormData = z.infer<typeof schema>;

const features = [
  { icon: TrendingUp, text: 'Track shared expenses in real-time' },
  { icon: Shield, text: 'Bank-grade security & encryption' },
  { icon: Zap, text: 'Instant debt simplification' },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success(`Welcome back, ${user.name}`);
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
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
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Sign in</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Continue managing your shared finances.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Email Address</label>
              <input {...register('email')} className="input" type="email" placeholder="you@example.com" />
              {errors.email && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input {...register('password')} className="input" type="password" placeholder="••••••••" />
              {errors.password && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-gold" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Continue'}
            </button>
          </form>

          <div className="divider" style={{ margin: '2rem 0' }}>or</div>

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
