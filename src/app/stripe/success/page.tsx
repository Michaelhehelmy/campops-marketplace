'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2 } from 'lucide-react';

function SuccessContent() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSessionId(params.get('session_id'));

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="h-20 w-20 rounded-[2rem] bg-green-50 flex items-center justify-center text-green-600 mx-auto mb-6">
          <CheckCircle2 className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Payment Successful!</h1>
        <p className="text-gray-500 mb-2">
          Your payment has been processed and your booking is confirmed.
        </p>
        {sessionId && (
          <p className="text-xs text-gray-400 mb-8 font-mono">
            Session: {sessionId.slice(0, 20)}&hellip;
          </p>
        )}
        <p className="text-gray-400 text-sm mb-6">
          Redirecting to homepage in {countdown}s&hellip;
        </p>
        <Link
          href="/"
          className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 inline-block"
        >
          Go to Homepage
        </Link>
      </div>
    </div>
  );
}

export default function StripeSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
