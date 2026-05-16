'use client';

import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Store,
  Users,
  Puzzle,
  BarChart3,
  Settings,
  Activity,
  LogOut,
} from 'lucide-react';

import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale as string;

  return (
    <PluginRegistryProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 text-white flex flex-col sticky top-0 h-screen">
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 bg-purple-600 rounded-lg flex items-center justify-center font-black text-white">
                C
              </div>
              <h2 className="font-black text-xl tracking-tight">SinaiCamps</h2>
            </div>
            <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest">
              Marketplace Master
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <SidebarLink
              icon={LayoutDashboard}
              label="Overview"
              href={`/${locale}/admin`}
              active={pathname === `/${locale}/admin`}
            />
            <SidebarLink
              icon={Store}
              label="Listings"
              href={`/${locale}/admin/listings`}
              active={pathname?.includes('/listings')}
            />
            <SidebarLink
              icon={Users}
              label="Accounts"
              href={`/${locale}/admin/accounts`}
              active={pathname?.includes('/accounts')}
            />
            <SidebarLink
              icon={Puzzle}
              label="Plugins"
              href={`/${locale}/admin/plugins`}
              active={pathname?.includes('/plugins')}
            />

            <PluginShell name="master.sidebar" />

            <SidebarLink
              icon={BarChart3}
              label="Commissions"
              href={`/${locale}/admin/reports/commissions`}
              active={pathname?.includes('/commissions')}
            />
            <SidebarLink
              icon={Activity}
              label="System Health"
              href={`/${locale}/admin/health`}
              active={pathname?.includes('/health')}
            />
            <div className="pt-4 mt-4 border-t border-slate-800">
              <SidebarLink
                icon={Settings}
                label="Settings"
                href={`/${locale}/admin/settings`}
                active={pathname?.includes('/settings')}
              />
            </div>
          </nav>

          <div className="p-4 border-t border-slate-800">
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8">
            <div className="font-bold text-gray-900">
              {pathname?.split('/').pop()?.charAt(0).toUpperCase()}
              {pathname?.split('/').pop()?.slice(1)}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">System Master</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Global Super Admin
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center text-purple-600 font-bold">
                SM
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-8">{children}</div>
        </main>
      </div>
    </PluginRegistryProvider>
  );
}

function SidebarLink({ icon: Icon, label, href, active = false }: any) {
  return (
    <Link
      href={href || '#'}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
        active
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-800'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
