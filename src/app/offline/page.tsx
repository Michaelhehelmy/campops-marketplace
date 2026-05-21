'use client';

import { useCallback } from 'react';

export default function OfflinePage() {
  const handleReload = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-8 bg-slate-900 text-slate-100">
      <div className="text-6xl mb-6">🏕️</div>
      <h1 className="text-2xl font-bold mb-3">You&apos;re offline</h1>
      <p className="text-slate-400 max-w-xs mb-8">
        It looks like you&apos;ve lost your internet connection. Please check your connection and
        try again.
      </p>
      <button
        className="bg-blue-500 text-white rounded-lg px-8 py-3 text-base cursor-pointer"
        onClick={handleReload}
      >
        Try again
      </button>
    </div>
  );
}
