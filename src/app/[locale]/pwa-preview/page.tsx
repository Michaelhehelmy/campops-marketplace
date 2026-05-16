'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PWAPreviewPage({ params }: { params: { locale: string } }) {
  const router = useRouter();

  useEffect(() => {
    // Set the flag to show PWA banner
    localStorage.setItem('pwa-preview', 'true');
    // Redirect to a sample listing where the banner will be shown
    router.push(`/${params.locale}/stay/safari-camp`);
  }, [params.locale, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
        <h1 className="text-xl font-bold text-gray-900">Activating PWA Preview...</h1>
        <p className="text-gray-500 mt-2">
          Redirecting you to Safari Camp with the PWA banner enabled.
        </p>
      </div>
    </div>
  );
}
