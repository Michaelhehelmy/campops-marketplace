'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ShieldX } from 'lucide-react';

export default function UnauthorizedPage() {
  const params = useParams();
  const locale = params.locale as string;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-8">
        <div className="h-20 w-20 rounded-[2rem] bg-red-50 flex items-center justify-center text-red-600 mx-auto mb-6">
          <ShieldX className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-gray-900 mb-3">Unauthorized</h1>
        <p className="text-gray-500 mb-8">
          You don&apos;t have permission to access this page. This area is restricted to authorized
          roles only.
        </p>
        <Link
          href={`/${locale}`}
          className="bg-brand-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 inline-block"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
