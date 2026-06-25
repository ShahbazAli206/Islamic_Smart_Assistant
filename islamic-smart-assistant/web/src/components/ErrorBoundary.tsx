'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';

interface State { error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-8 text-center">
          <span className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-3xl">⚠️</span>
          <div>
            <h2 className="text-xl font-bold text-emerald-950 mb-2">Something went wrong</h2>
            <p className="text-sm text-emerald-900/60 max-w-sm leading-relaxed">
              An unexpected error occurred. You can try reloading this section.
            </p>
            <p className="mt-2 text-xs text-rose-500/80 font-mono max-w-sm break-all">
              {this.state.error.message}
            </p>
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition"
          >
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
