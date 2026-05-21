'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function StripeCancelPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="h-20 w-20 rounded-[2rem] bg-amber-50 flex items-center justify-center text-amber-600 mx-auto mb-6">
          <XCircle className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Payment Cancelled</h1>
        <p className="text-gray-500 mb-8">
          Your payment was not completed. No charges have been made. You can return to checkout
          whenever you&apos;re ready.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="bg-gray-100 text-gray-700 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 transition-all inline-block"
          >
            Go Home
          </Link>
          <Link
            href="/book"
            className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 inline-block"
          >
            Return to Checkout
          </Link>
        </div>
      </div>
    </div>
  );
}
