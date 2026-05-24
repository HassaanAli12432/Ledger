import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Receipt, ArrowLeftRight, LogOut, BookOpen, Users2, Bell, MessageCircle, Sun, Moon, BarChart3 } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/friends', icon: Users2, label: 'Friends' },
  { to: '/expenses', icon: Receipt, label: 'Expenses' },
  { to: '/settlements', icon: ArrowLeftRight, label: 'Settle Up' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/chat', icon: MessageCircle, label: 'Chat' },
];

export default function Sidebar({ onNavClick }: { onNavClick?: () => void }) {
  const { user, refreshToken, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const { isSupported, isSubscribed, subscribeToPush } = usePushNotifications();

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken });
    } catch { /* ignore */ }
    logout();
    navigate('/login');
    toast.success('Signed out');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border-medium)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <BookOpen size={18} color="#FFFFFF" />
          </div>
          <div>
            <div style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: 1 }}>Ledger</div>
            <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.55rem', letterSpacing: '0.15em', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>Expense Tracker</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={onNavClick}
          >
            <Icon size={14} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom Section */}
      <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--border-medium)' }}>
        {/* Theme Toggle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.5rem 0.875rem', marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {theme === 'dark' ? <Moon size={14} /> : <Sun size={14} />}
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
          <button
            className="theme-toggle"
            data-active={theme === 'light'}
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-knob">
              {theme === 'dark' ? <Moon size={10} color="#fff" /> : <Sun size={10} color="#fff" />}
            </div>
          </button>
        </div>

        {/* User Info */}
        {user && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--accent-hover), var(--bg-tertiary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-primary)',
                flexShrink: 0,
              }}>
                {user.name[0].toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontFamily: '"Crimson Pro", serif', fontSize: '0.9rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                <div style={{ fontFamily: '"DM Mono", monospace', fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            </div>
          </div>
        )}
        
        {isSupported && !isSubscribed && (
          <button onClick={subscribeToPush} className="nav-item" style={{ width: '100%', background: 'none', color: 'var(--accent-primary)', borderColor: 'transparent', marginBottom: '0.25rem' }}>
            <Bell size={14} />
            Enable Notifications
          </button>
        )}

        <button onClick={handleLogout} className="nav-item" style={{ width: '100%', background: 'none', color: 'var(--danger)', borderColor: 'transparent' }}>
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
