'use client';

import { useEffect } from 'react';

export default function GuestError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('Guest area error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white" role="alert">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <span className="text-red-500 text-3xl" role="img" aria-hidden="true">!</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-500 mb-6">
          The guest area encountered an unexpected error. Please try again.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="text-xs text-red-400 mb-6 p-4 bg-red-50 rounded-lg overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <button
          onClick={reset}
          className="px-6 py-2 bg-brand-600 text-white rounded-lg font-semibold hover:bg-brand-700 transition-colors focus:ring-2 focus:ring-brand-500 focus:outline-none"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
