'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LayoutDashboard, LogOut, Search, Menu, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function Nav({ locale }: { locale: string }) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
  const userName = session?.user?.name;
  const userRole = (session?.user as any)?.role;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <a href={`/${locale}`} className="flex items-center gap-3">
          <img src="/sinaicamps.png" alt="SinaiCamps Logo" className="h-8 w-auto object-contain" />
          <span className="text-2xl font-black text-brand-600">SinaiCamps</span>
        </a>

        <div className="hidden lg:flex items-center gap-6">
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

        {/* Mobile hamburger */}
        <button
          className="lg:hidden p-2 text-gray-500 hover:text-brand-600 transition-colors rounded-xl hover:bg-gray-50"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="px-4 py-3 space-y-1">
            <a
              href={`/${locale}`}
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              Home
            </a>
            <a
              href={`/${locale}/search`}
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
            >
              Search
            </a>
            {!isPending && (
              <>
                {session ? (
                  <>
                    {dashboardLink && (
                      <a
                        href={dashboardLink}
                        onClick={closeMobileMenu}
                        className="block px-3 py-2.5 rounded-xl text-gray-700 font-bold hover:bg-gray-50 transition-colors"
                      >
                        Dashboard
                      </a>
                    )}
                    <div className="px-3 py-2 text-xs text-gray-400 uppercase tracking-widest">
                      {userName} &middot; {userRole}
                    </div>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-red-600 font-bold hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <a
                    href={`/${locale}/login`}
                    onClick={closeMobileMenu}
                    className="block px-3 py-2.5 rounded-xl text-brand-600 font-bold hover:bg-brand-50 transition-colors"
                  >
                    Sign In
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
