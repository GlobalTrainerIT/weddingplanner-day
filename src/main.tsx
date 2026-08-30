import { StrictMode, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App error:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', background: '#faf9f7' }}>
          <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '480px' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>&#x2661;</div>
            <h1 style={{ color: '#2a1f15', marginBottom: '0.5rem', fontSize: '1.25rem' }}>Something went wrong</h1>
            <p style={{ color: '#6a5a4a', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              We had trouble loading your planner. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.href = '/'}
              style={{ background: '#c9a96e', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem 2rem', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Return to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
