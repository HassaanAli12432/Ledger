import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      toast.success('Account created! Welcome to Ledger.');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
            Split everything,<br/>owe nothing
          </h2>
          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
            Track shared expenses with friends, roommates, and travel companions. Our smart algorithm minimizes the number of transactions needed to settle all debts.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-panel-right">
        <div className="animate-fade-up">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Create Account</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
              Start tracking shared expenses today.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="label">Full Name</label>
              <input {...register('name')} className="input" placeholder="John Doe" />
              {errors.name && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.name.message}</p>}
            </div>

            <div>
              <label className="label">Email Address</label>
              <input {...register('email')} className="input" type="email" placeholder="you@example.com" />
              {errors.email && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">Password</label>
              <input {...register('password')} className="input" type="password" placeholder="Min. 8 characters" />
              {errors.password && <p style={{ fontSize: '0.8125rem', color: 'var(--danger)', marginTop: '0.375rem', fontWeight: 500 }}>{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-gold" style={{ marginTop: '0.5rem', width: '100%' }} disabled={loading}>
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>

          <div className="divider" style={{ margin: '2rem 0' }}>or</div>

          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 500 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
