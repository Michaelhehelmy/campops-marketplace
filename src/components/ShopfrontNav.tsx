'use client';

import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LayoutDashboard, LogOut, Menu, X, Tent, Calendar, Mail, Home, BedDouble } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  locale: string;
  tenant: {
    id: string;
    slug: string;
    name: string;
    branding?: any;
  };
}

export function ShopfrontNav({ locale, tenant }: Props) {
  const { data: session, isPending } = authClient.useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const colors = tenant.branding?.colors || {
    primary: '#0f172a',
    secondary: '#3b82f6',
    accent: '#10b981',
  };

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
  const logoUrl = tenant.branding?.logo?.url;

  return (
    <nav 
      className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-900/80 shadow-lg"
      style={{
        borderBottomColor: `${colors.secondary}20`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href={`/${locale}`} className="flex items-center gap-3 group">
          {logoUrl ? (
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-slate-800 transition-colors duration-300">
              <img
                src={logoUrl}
                alt={`${tenant.name} Logo`}
                className="h-full w-full object-cover"
              />
            </div>
          ) : (
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-all duration-300"
              style={{
                borderColor: `${colors.secondary}40`,
                backgroundColor: `${colors.primary}80`,
              }}
            >
              <Tent 
                className="w-5 h-5 transition-transform group-hover:scale-110"
                style={{ color: colors.secondary || '#3b82f6' }}
              />
            </div>
          )}
          <span 
            className="text-xl font-black bg-gradient-to-r bg-clip-text text-transparent group-hover:opacity-90 transition-opacity"
            style={{
              backgroundImage: `linear-gradient(to right, ${colors.secondary || '#3b82f6'}, ${colors.accent || '#10b981'})`
            }}
          >
            {tenant.name}
          </span>
        </a>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-6">
          <a
            href={`/${locale}`}
            className="text-zinc-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            Home
          </a>
          <a
            href={`/${locale}#rooms`}
            className="text-zinc-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <BedDouble className="w-4 h-4" />
            Rooms
          </a>
          <a
            href={session ? `/${locale}/guest` : `/${locale}/login`}
            className="text-zinc-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            Bookings
          </a>
          <a
            href={`/${locale}#contact`}
            className="text-zinc-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-1.5"
          >
            <Mail className="w-4 h-4" />
            Contact
          </a>

          <div className="h-6 w-px bg-slate-800" />

          {!isPending && (
            <>
              {session ? (
                <div className="flex items-center gap-4">
                  {dashboardLink && (
                    <a
                      href={dashboardLink}
                      className="text-zinc-400 hover:text-white transition-colors font-bold text-sm flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </a>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-black text-white leading-none">
                        {session.user.name}
                      </p>
                      <p 
                        className="text-[9px] font-bold uppercase tracking-widest mt-1"
                        style={{ color: colors.secondary }}
                      >
                        {(session.user as any).role}
                      </p>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all bg-slate-900/60 border border-slate-800 rounded-xl"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href={`/${locale}/login`}
                  className="px-5 py-2 rounded-xl text-sm font-black transition-all shadow-md active:scale-[0.98] text-white"
                  style={{
                    backgroundColor: colors.secondary,
                    boxShadow: `0 4px 14px ${colors.secondary}30`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = colors.accent;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = colors.secondary;
                  }}
                >
                  Sign In
                </a>
              )}
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-zinc-400 hover:text-white transition-colors bg-slate-900 border border-slate-800 rounded-xl"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-900 bg-slate-950 px-4 pt-4 pb-6 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="space-y-2">
            <a
              href={`/${locale}`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-slate-900/60 transition-all font-bold text-sm"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
            <a
              href={`/${locale}#rooms`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-slate-900/60 transition-all font-bold text-sm"
            >
              <BedDouble className="w-4 h-4" />
              Rooms
            </a>
            <a
              href={session ? `/${locale}/guest` : `/${locale}/login`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-slate-900/60 transition-all font-bold text-sm"
            >
              <Calendar className="w-4 h-4" />
              Bookings
            </a>
            <a
              href={`/${locale}#contact`}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-slate-900/60 transition-all font-bold text-sm"
            >
              <Mail className="w-4 h-4" />
              Contact
            </a>
          </div>

          <div className="h-px bg-slate-900" />

          {!isPending && (
            <div className="pt-2">
              {session ? (
                <div className="space-y-4">
                  <div className="px-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white uppercase">
                      {session.user.name?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{session.user.name}</p>
                      <p 
                        className="text-[9px] font-bold uppercase tracking-widest mt-0.5"
                        style={{ color: colors.secondary }}
                      >
                        {(session.user as any).role}
                      </p>
                    </div>
                  </div>
                  {dashboardLink && (
                    <a
                      href={dashboardLink}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl text-zinc-400 hover:text-white hover:bg-slate-900/60 transition-all font-bold text-sm"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-all font-bold text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <a
                  href={`/${locale}/login`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center py-3.5 rounded-2xl text-sm font-black transition-all shadow-md text-white"
                  style={{
                    backgroundColor: colors.secondary,
                    boxShadow: `0 4px 14px ${colors.secondary}30`,
                  }}
                >
                  Sign In
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
