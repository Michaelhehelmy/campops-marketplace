'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Heart, Search } from 'lucide-react';
import { authClient } from '@/lib/auth-client';

export default function GuestFollowingPage() {
  const { locale } = useParams();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  useEffect(() => {
    if (!session) {
      router.push(`/${locale}/login`);
    }
  }, [session, locale, router]);
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight">Following</h1>
          <p className="text-gray-500 mt-2">Camps and properties you've saved for later.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <button className="min-h-[300px] rounded-[2.5rem] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-gray-300 hover:text-brand-600 hover:border-brand-200 hover:bg-brand-50/30 transition-all group">
          <div className="p-6 rounded-3xl bg-gray-50 group-hover:bg-white transition-all mb-4">
            <Search className="h-10 w-10" />
          </div>
          <span className="font-black text-xl tracking-tight">Discover More Camps</span>
        </button>
      </div>
    </div>
  );
}
