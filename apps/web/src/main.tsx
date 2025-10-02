// apps/web/src/main.tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import RootRouter from './router';

// Error boundary for production
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-black text-zinc-100 font-mono">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-zinc-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found. Make sure index.html has <div id="root"></div>');
}

createRoot(root).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootRouter />
    </ErrorBoundary>
  </React.StrictMode>
);