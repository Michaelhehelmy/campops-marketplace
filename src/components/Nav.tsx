'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LayoutDashboard, LogOut, Search, Menu, X, Shield } from 'lucide-react';
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
    <nav className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900/80 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href={`/${locale}`} className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden border border-amber-500/20 group-hover:border-amber-500/40 transition-colors duration-300">
            <img src="/sinaicamps.png" alt="SinaiCamps Logo" className="h-full w-full object-cover scale-[1.2]" />
          </div>
          <span className="text-xl font-black bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
            SinaiCamps
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden lg:flex items-center gap-6">
          <a
            href={`/${locale}/search`}
            className="text-zinc-400 hover:text-amber-400 transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <Search className="w-4 h-4 text-amber-500/80" />
            Search
          </a>

          {!isPending && (
            <>
              {session ? (
                <div className="flex items-center gap-4">
                  {dashboardLink && (
                    <a
                      href={dashboardLink}
                      className="text-zinc-400 hover:text-amber-400 transition-colors font-bold text-sm flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="w-4 h-4 text-amber-500/80" />
                      Dashboard
                    </a>
                  )}
                  <div className="h-8 w-px bg-slate-800/80" />
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-white leading-none">
                        {session.user.name}
                      </p>
                      <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest mt-1">
                        {(session.user as any).role}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all bg-slate-900/60 border border-slate-800 rounded-xl"
                      title="Sign Out"
                    >
                      <LogOut className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href={`/${locale}/login`}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 px-5 py-2 rounded-xl text-sm font-black transition-all shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-[0.98]"
                >
                  Sign In
                </a>
              )}
            </>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className="lg:hidden p-2 text-zinc-400 hover:text-amber-400 transition-colors rounded-xl bg-slate-900/60 border border-slate-800"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-900 bg-slate-950">
          <div className="px-4 py-3 space-y-1">
            <a
              href={`/${locale}`}
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-xl text-zinc-300 font-bold hover:bg-slate-900 hover:text-amber-400 transition-colors"
            >
              Home
            </a>
            <a
              href={`/${locale}/search`}
              onClick={closeMobileMenu}
              className="block px-3 py-2.5 rounded-xl text-zinc-300 font-bold hover:bg-slate-900 hover:text-amber-400 transition-colors"
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
                        className="block px-3 py-2.5 rounded-xl text-zinc-300 font-bold hover:bg-slate-900 hover:text-amber-400 transition-colors"
                      >
                        Dashboard
                      </a>
                    )}
                    <div className="px-3 py-2 text-xs text-zinc-500 uppercase tracking-widest border-t border-slate-900 mt-2 pt-2">
                      {userName} &middot; <span className="text-amber-400">{userRole}</span>
                    </div>
                    <button
                      onClick={() => {
                        closeMobileMenu();
                        handleSignOut();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-red-400 font-bold hover:bg-red-950/20 transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <a
                    href={`/${locale}/login`}
                    onClick={closeMobileMenu}
                    className="block px-3 py-2.5 rounded-xl text-center bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black hover:from-amber-600 hover:to-amber-700 transition-all mt-2"
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
