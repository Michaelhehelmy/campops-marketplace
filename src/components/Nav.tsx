'use client';

import { authClient } from '@/lib/auth-client';
import { User, LayoutDashboard, LogOut, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Nav({ locale }: { locale: string }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.refresh();
    router.push(`/${locale}`);
  };

  const getDashboardLink = () => {
    if (!session?.user) return null;
    const role = (session.user as any).role;
    if (role === 'master' || role === 'marketplace_master') return `/${locale}/admin/plugins`;
    if (role === 'manager') return `/${locale}/owner/dashboard`;
    return `/${locale}/guest`;
  };

  const dashboardLink = getDashboardLink();

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href={`/${locale}`} className="flex items-center gap-2">
          <span className="text-2xl font-black text-brand-600">CampOps</span>
        </a>

        <div className="flex items-center gap-6">
          <a
            href={`/${locale}/search`}
            className="text-gray-500 hover:text-brand-600 transition-colors font-bold flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Search
          </a>

          {!isPending && (
            <>
              {session ? (
                <div className="flex items-center gap-4">
                  {dashboardLink && (
                    <a
                      href={dashboardLink}
                      className="text-gray-500 hover:text-brand-600 transition-colors font-bold flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </a>
                  )}
                  <div className="h-8 w-px bg-gray-100" />
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-gray-900 leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        {(session.user as any).role}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 rounded-xl"
                      title="Sign Out"
                    >
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href={`/${locale}/login`}
                  className="bg-brand-600 text-white px-6 py-2.5 rounded-2xl font-black hover:bg-brand-700 transition-all shadow-lg shadow-brand-200"
                >
                  Sign In
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
