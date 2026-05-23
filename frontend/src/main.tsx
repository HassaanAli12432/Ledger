import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

// Hydrate theme from localStorage before first paint to prevent flash
const savedTheme = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem('ledger-theme') || '{}');
    return stored?.state?.theme || 'dark';
  } catch {
    return 'dark';
  }
})();
document.documentElement.setAttribute('data-theme', savedTheme);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: 'white' }}>
          <h1>React Crashed!</h1>
          <pre>{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-medium)',
              fontFamily: '"DM Mono", monospace',
              fontSize: '0.75rem',
              letterSpacing: '0.05em',
              boxShadow: 'var(--shadow-md)',
            },
            success: {
              iconTheme: { primary: 'var(--success)', secondary: 'var(--bg-secondary)' },
            },
            error: {
              iconTheme: { primary: 'var(--danger)', secondary: 'var(--bg-secondary)' },
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

