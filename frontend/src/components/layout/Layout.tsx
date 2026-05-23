import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect } from 'react';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import VoiceExpenseButton from '@/components/VoiceExpenseButton';

export default function Layout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const qc = useQueryClient();

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

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
      <VoiceExpenseButton />
    </div>
  );
}
