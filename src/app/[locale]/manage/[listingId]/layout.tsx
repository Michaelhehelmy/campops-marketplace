'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Loader2,
  LayoutDashboard,
  Settings,
  Users,
  CreditCard,
  ChevronLeft,
  Calendar,
  Store,
  Activity,
  BarChart3,
  Brush,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';
import { MobileSidebar } from '@/components/dashboard/MobileSidebar';

/** Core nav items always present in the sidebar regardless of plugins. */
const CORE_NAV = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '', exact: true, minRole: 'staff' },
  { icon: Calendar, label: 'Bookings', path: '/bookings', minRole: 'staff' },
  { icon: Store, label: 'Rooms & Units', path: '/rooms', minRole: 'manager' },
  { icon: Users, label: 'Guests (CRM)', path: '/guests', minRole: 'staff' },
  { icon: CreditCard, label: 'Orders & POS', path: '/orders', minRole: 'staff' },
  { icon: Brush, label: 'Housekeeping', path: '/housekeeping', minRole: 'staff', pluginRequired: 'housekeeping' },
  { icon: Wrench, label: 'Maintenance', path: '/maintenance', minRole: 'staff', pluginRequired: 'maintenance' },
  { icon: Activity, label: 'Operations', path: '/operations', minRole: 'staff', pluginRequired: 'operations' },
  { icon: BarChart3, label: 'Finance', path: '/finance', minRole: 'manager' },
  { icon: Users, label: 'Staff Roster', path: '/staff', minRole: 'manager' },
  { icon: Settings, label: 'Listing Settings', path: '/settings', minRole: 'manager' },
];

const ROLE_ORDER = ['staff', 'manager', 'master'];
function roleAtLeast(userRole: string, minRole: string) {
  return ROLE_ORDER.indexOf(userRole) >= ROLE_ORDER.indexOf(minRole);
}

interface PluginMenuItem {
  label: string;
  href?: string;
  path?: string;
  icon?: string;
  pluginId?: string;
}

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const listingId = params.listingId as string;
  const locale = params.locale as string;
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [pluginMenuItems, setPluginMenuItems] = useState<PluginMenuItem[]>([]);
  const [isTenantDomain, setIsTenantDomain] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname.toLowerCase();
      const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'sinaicamps.com').toLowerCase();
      const isMain =
        hostname === BASE_DOMAIN || hostname === `www.${BASE_DOMAIN}` || hostname === 'localhost';
      setIsTenantDomain(!isMain || hostname === '127.0.0.1');
    }
  }, []);

  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/sinaicamps_impersonating=([^;]*)/);
    if (match) setIsImpersonating(true);
  }, []);

  useEffect(() => {
    const resolveContext = async () => {
      try {
        const accessRes = await fetch(`/api/listing-access?listing=${listingId}`);
        if (!accessRes.ok) {
          console.error(`[ManageLayout] Listing access failed: ${accessRes.status}`);
          router.push(`/${locale}/owner/dashboard`);
          return;
        }

        const accessData = await accessRes.json();
        const role = accessData.role || 'staff';

        let propName = listingId;
        try {
          const propRes = await fetch(`/api/public/properties/${listingId}`);
          if (propRes.ok) {
            const propData = await propRes.json();
            propName = propData.property?.name || listingId;
          }
        } catch {}

        setProperty({ id: listingId, name: propName, role });

        try {
          const regRes = await fetch(`/api/plugins/ui-registry?propertyId=${listingId}`);
          if (regRes.ok) {
            const regData = await regRes.json();
            setPluginMenuItems(regData.menuItems ?? []);
          }
        } catch (err) {
          console.warn('[ManageLayout] Failed to load plugin menu items:', err);
        }
      } catch (error) {
        console.error('Failed to resolve listing context:', error);
      } finally {
        setLoading(false);
      }
    };
    resolveContext();
  }, [listingId, locale, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-brand-600 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Resolving listing context...</p>
        </div>
      </div>
    );
  }

  const base = `/${locale}/manage/${listingId}`;
  const role = property?.role ?? 'staff';

  return (
    <PluginRegistryProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Mobile Sidebar Overlay */}
        <MobileSidebar>
          <ManageSidebarContent
            isTenantDomain={isTenantDomain}
            isImpersonating={isImpersonating}
            locale={locale}
            base={base}
            property={property}
            role={role}
            pathname={pathname}
            pluginMenuItems={pluginMenuItems}
            router={router}
          />
        </MobileSidebar>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col sticky top-0 h-screen">
          <ManageSidebarContent
            isTenantDomain={isTenantDomain}
            isImpersonating={isImpersonating}
            locale={locale}
            base={base}
            property={property}
            role={role}
            pathname={pathname}
            pluginMenuItems={pluginMenuItems}
            router={router}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">{property.name}</div>
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Property Admin
                </div>
              </div>
              <div className="h-10 w-10 rounded-full bg-brand-100 border-2 border-white shadow-sm"></div>
            </div>
          </header>
          <div className="p-8">
            <div className="mb-6">
              <PluginShell name="manager.tabs" props={{ property }} />
            </div>
            {children}
          </div>
        </main>
      </div>
    </PluginRegistryProvider>
  );
}

/** Reusable sidebar content used in both mobile and desktop sidebars. */
function ManageSidebarContent({
  isTenantDomain,
  isImpersonating,
  locale,
  base,
  property,
  role,
  pathname,
  pluginMenuItems,
  router,
}: {
  isTenantDomain: boolean;
  isImpersonating: boolean;
  locale: string;
  base: string;
  property: any;
  role: string;
  pathname: string;
  pluginMenuItems: PluginMenuItem[];
  router: ReturnType<typeof useRouter>;
}) {
  // Build set of enabled plugin IDs from the UI registry
  const enabledPluginIds = new Set(
    pluginMenuItems.map((item) => item.pluginId).filter((id): id is string => !!id)
  );
  // Only show core nav items whose required plugin (if any) is enabled
  const filteredCoreNav = CORE_NAV.filter((item: any) => {
    if (item.pluginRequired && !enabledPluginIds.has(item.pluginRequired)) return false;
    return true;
  });

  return (
    <>
      {isImpersonating && (
        <div className="bg-amber-500 text-white text-xs font-bold text-center py-2 px-4 flex items-center justify-between">
          <span>⚡ Impersonating</span>
          <button
            onClick={async () => {
              await fetch('/api/admin/impersonate/stop', { method: 'POST' });
              window.location.href = `/${locale}/admin/listings`;
            }}
            className="underline ml-2"
          >
            Exit
          </button>
        </div>
      )}
      <div className="p-6 border-b border-gray-100">
        {!isTenantDomain ? (
          <button
            onClick={() => router.push(`/${locale}/search`)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all text-xs font-bold uppercase tracking-widest mb-4"
          >
            <ChevronLeft className="h-3 w-3" /> Back to Market
          </button>
        ) : (
          <button
            onClick={() => router.push(`/${locale}`)}
            className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all text-xs font-bold uppercase tracking-widest mb-4"
          >
            <ChevronLeft className="h-3 w-3" /> Back to Site
          </button>
        )}
        <h2 className="font-black text-gray-900 truncate">{property.name}</h2>
        <span className="text-[10px] text-brand-600 font-bold uppercase tracking-widest">
          Listing Admin
        </span>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <PluginShell name="manager.sidebar.top" props={{ property }} />

        {filteredCoreNav.map((item) => {
          if (!roleAtLeast(role, item.minRole)) return null;
          const href = item.path === '' ? base : `${base}${item.path}`;
          const active = item.exact
            ? pathname === href
            : (pathname?.includes(item.path) ?? false);
          return (
            <SidebarLink
              key={item.path}
              icon={item.icon}
              label={item.label}
              href={href}
              active={active}
            />
          );
        })}

        <PluginShell name="manager.sidebar.middle" props={{ property }} />

        {pluginMenuItems.map((item, i) => {
          const href = item.href ?? (item.path ? `${base}${item.path}` : '#');
          const active = item.path ? (pathname?.includes(item.path) ?? false) : false;
          return (
            <SidebarLink
              key={`plugin-${i}`}
              icon={null}
              label={item.label}
              href={href}
              active={active}
              isPlugin
            />
          );
        })}

        <PluginShell name="manager.sidebar.bottom" props={{ property }} />
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="bg-brand-50 p-4 rounded-2xl">
          <div className="text-[10px] text-brand-600 font-black uppercase tracking-widest mb-1">
            Status
          </div>
          <div className="text-sm font-bold text-gray-900">Live on Marketplace</div>
        </div>
      </div>
    </>
  );
}

function SidebarLink({
  icon: Icon,
  label,
  href,
  active = false,
  isPlugin = false,
}: {
  icon: LucideIcon | null;
  label: string;
  href: string;
  active?: boolean;
  isPlugin?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
        active
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-100'
          : 'text-gray-500 hover:bg-gray-50 hover:text-brand-600'
      }`}
    >
      {Icon ? (
        <Icon className="h-5 w-5" />
      ) : (
        <span
          className={`h-5 w-5 flex items-center justify-center text-xs ${isPlugin ? 'opacity-60' : ''}`}
        >
          ⬡
        </span>
      )}
      {label}
    </Link>
  );
}
