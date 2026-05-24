import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect, useState } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import VoiceExpenseButton from '@/components/VoiceExpenseButton';
import { Menu, X } from 'lucide-react';

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const socket = connectSocket();

    socket.on('expense:created', () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['friends'] });
    });
    
    socket.on('settlement:created', () => {
      qc.invalidateQueries({ queryKey: ['settlements'] });
      qc.invalidateQueries({ queryKey: ['balances'] });
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['friends'] });
    });

    return () => {
      socket.off('expense:created');
      socket.off('settlement:created');
      disconnectSocket();
    };
  }, [isAuthenticated]);

  // Close mobile menu on route change
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 900) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 30, height: 30,
            background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))',
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: '#fff',
          }}>L</div>
          <span style={{ fontFamily: '"Playfair Display", serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Ledger</span>
        </div>
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="mobile-sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`sidebar-wrapper ${mobileMenuOpen ? 'open' : ''}`}>
        <Sidebar onNavClick={() => setMobileMenuOpen(false)} />
      </div>

      <main className="main-content">
        <Outlet />
      </main>
      <VoiceExpenseButton />
    </div>
  );
}
