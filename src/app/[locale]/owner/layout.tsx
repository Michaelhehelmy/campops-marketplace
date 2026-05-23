'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { LayoutDashboard, Building2, CalendarDays, LogOut, TrendingUp, Puzzle } from 'lucide-react';
import {
  PluginRegistryProvider,
  usePluginMenuItems,
} from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PluginRegistryProvider>
      <OwnerLayoutInner>{children}</OwnerLayoutInner>
    </PluginRegistryProvider>
  );
}

function OwnerLayoutInner({ children }: { children: React.ReactNode }) {
  const { locale } = useParams();
  const pathname = usePathname();
  const base = `/${locale}/owner`;
  const pluginMenuItems = usePluginMenuItems();
  const [platformName, setPlatformName] = useState('SinaiCamps Marketplace');

  useEffect(() => {
    fetch('/api/public/platform-settings')
      .then((res) => res.json())
      .then((data) => {
        if (data.platformName) setPlatformName(data.platformName);
      })
      .catch(() => {});
  }, []);

  const nav = [
    { href: `${base}/dashboard`, label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: `${base}/property`, label: 'My Property', icon: <Building2 size={18} /> },
    { href: `${base}/bookings`, label: 'Bookings', icon: <CalendarDays size={18} /> },
    { href: `${base}/revenue`, label: 'Revenue', icon: <TrendingUp size={18} /> },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = `/${locale}/login`;
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-60 bg-gray-900 text-white flex flex-col shrink-0">
        <div className="px-6 py-6 border-b border-white/10">
          <Link href="/" className="block text-lg font-bold text-brand-400">
            {platformName}
          </Link>
          <p className="text-xs text-white/40 mt-0.5">Owner Portal</p>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider px-3 mb-2">
            Main
          </div>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                pathname.startsWith(item.href)
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          {pluginMenuItems.length > 0 && (
            <>
              <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider px-3 mt-6 mb-2">
                Plugins
              </div>
              {pluginMenuItems.map((item) => (
                <Link
                  key={item.id}
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    pathname.startsWith(item.path)
                      ? 'bg-white/10 text-white'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Puzzle size={18} className="text-brand-400" />
                  {item.label}
                </Link>
              ))}
            </>
          )}

          <PluginShell name="nav.main" />
        </nav>

        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          <Link
            href={`/${locale}/list-your-camp/plan`}
            className="block w-full text-center text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-2 rounded-lg font-medium transition-colors"
          >
            Upgrade to Operations Suite ↑
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white/50 hover:text-white w-full rounded-lg hover:bg-white/5 transition-colors"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-10">{children}</div>
      </main>
    </div>
  );
}
