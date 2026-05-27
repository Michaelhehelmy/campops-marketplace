'use client';

import { useEffect } from 'react';

export default function ManageError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Manage dashboard error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950" role="alert">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-red-500 text-3xl" role="img" aria-hidden="true">!</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-slate-400 mb-6">
          The management panel encountered an unexpected error. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs text-red-400 mb-6 p-4 bg-red-950/30 rounded-lg overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="px-6 py-2 bg-amber-500 text-slate-950 rounded-lg font-semibold hover:bg-amber-400 transition-colors focus:ring-2 focus:ring-amber-500 focus:outline-none"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
