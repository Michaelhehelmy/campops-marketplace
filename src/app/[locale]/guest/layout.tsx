'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Home, Calendar, ShoppingBag, User, Heart, Bell, LogOut, ChevronLeft } from 'lucide-react';

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const locale = params.locale as string;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Navigation */}
      <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm shadow-gray-100/50">
        <div className="flex items-center gap-12">
          <div className="flex items-center gap-2" onClick={() => router.push(`/${locale}/search`)}>
            <div className="h-8 w-8 bg-brand-600 rounded-lg flex items-center justify-center font-black text-white cursor-pointer">
              C
            </div>
            <h2 className="font-black text-xl tracking-tight cursor-pointer">SinaiCamps</h2>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <NavLink
              href={`/${locale}/guest`}
              active={pathname === `/${locale}/guest`}
              icon={Calendar}
              label="Trips"
            />
            <NavLink
              href={`/${locale}/guest/orders`}
              active={pathname?.includes('/orders')}
              icon={ShoppingBag}
              label="Orders"
            />
            <NavLink
              href={`/${locale}/guest/following`}
              active={pathname?.includes('/following')}
              icon={Heart}
              label="Following"
            />
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <button className="relative p-2 text-gray-400 hover:text-brand-600 transition-all">
            <Bell className="h-6 w-6" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <Link
            href={`/${locale}/guest/profile`}
            className="flex items-center gap-3 pl-6 border-l border-gray-100"
          >
            <div className="text-right hidden sm:block">
              <div className="text-sm font-bold text-gray-900">Michael Guest</div>
              <div className="text-[10px] text-brand-600 font-bold uppercase tracking-widest">
                Guest Member
              </div>
            </div>
            <div className="h-10 w-10 rounded-full bg-brand-100 border-2 border-white shadow-sm flex items-center justify-center text-brand-600 font-bold overflow-hidden">
              <User className="h-6 w-6" />
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">{children}</main>

      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            © 2026 SinaiCamps Marketplace. All rights reserved.
          </div>
          <div className="flex gap-8">
            <button className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-brand-600 transition-all">
              Terms
            </button>
            <button className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-brand-600 transition-all">
              Privacy
            </button>
            <button className="text-[10px] text-gray-400 font-bold uppercase tracking-widest hover:text-red-500 transition-all flex items-center gap-2">
              <LogOut className="h-3 w-3" /> Sign Out
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, active, icon: Icon, label }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 text-sm font-bold transition-all ${
        active ? 'text-brand-600' : 'text-gray-500 hover:text-brand-600'
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? 'fill-brand-50' : ''}`} />
      {label}
    </Link>
  );
}
