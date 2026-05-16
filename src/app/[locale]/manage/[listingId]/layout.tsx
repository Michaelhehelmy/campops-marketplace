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
} from 'lucide-react';

import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const listingId = params.listingId as string;
  const locale = params.locale as string;
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);

  useEffect(() => {
    const resolveContext = async () => {
      try {
        const res = await fetch(`/api/listing-access?listing=${listingId}`);
        if (res.ok) {
          const data = await res.json();
          const role = data.role || 'staff';

          // Staff restriction is handled per-page (finance/settings show "Unauthorized" inline)

          let propName = listingId;
          try {
            const propRes = await fetch(`/api/public/properties/${listingId}`);
            if (propRes.ok) {
              const propData = await propRes.json();
              propName = propData.property?.name || listingId;
            }
          } catch {}
          if (propName === listingId) {
            propName =
              listingId === 'safari-camp'
                ? 'Safari Camp'
                : listingId === '1'
                  ? 'Safari Camp'
                  : listingId === '2'
                    ? 'Mountain Lodge'
                    : listingId;
          }
          setProperty({
            id: listingId,
            name: propName,
            role,
          });
        } else {
          const text = await res.text();
          console.error(
            `[ManageLayout] Listing access failed: ${res.status} ${res.statusText}`,
            text
          );
          router.push(`/${locale}/owner/dashboard`);
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

  return (
    <PluginRegistryProvider>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
          <div className="p-6 border-b border-gray-100">
            <button
              onClick={() => router.push(`/${locale}/search`)}
              className="flex items-center gap-2 text-gray-400 hover:text-brand-600 transition-all text-xs font-bold uppercase tracking-widest mb-4"
            >
              <ChevronLeft className="h-3 w-3" /> Back to Market
            </button>
            <h2 className="font-black text-gray-900 truncate">{property.name}</h2>
            <span className="text-[10px] text-brand-600 font-bold uppercase tracking-widest">
              Listing Admin
            </span>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <PluginShell name="manager.sidebar.top" props={{ property }} />

            <SidebarLink
              icon={LayoutDashboard}
              label="Dashboard"
              href={`/${locale}/manage/${listingId}`}
              active={pathname === `/${locale}/manage/${listingId}`}
            />
            <SidebarLink
              icon={Calendar}
              label="Bookings"
              href={`/${locale}/manage/${listingId}/bookings`}
              active={pathname?.includes('/bookings')}
            />
            {property.role !== 'staff' && (
              <SidebarLink
                icon={Store}
                label="Rooms & Units"
                href={`/${locale}/manage/${listingId}/rooms`}
                active={pathname?.includes('/rooms')}
              />
            )}
            <SidebarLink
              icon={Users}
              label="Guests (CRM)"
              href={`/${locale}/manage/${listingId}/guests`}
              active={pathname?.includes('/guests')}
            />
            <SidebarLink
              icon={CreditCard}
              label="Orders & POS"
              href={`/${locale}/manage/${listingId}/orders`}
              active={pathname?.includes('/orders')}
            />

            <PluginShell name="manager.sidebar.middle" props={{ property }} />

            <SidebarLink
              icon={Brush}
              label="Housekeeping"
              href={`/${locale}/manage/${listingId}/housekeeping`}
              active={pathname?.includes('/housekeeping')}
            />
            <SidebarLink
              icon={Wrench}
              label="Maintenance"
              href={`/${locale}/manage/${listingId}/maintenance`}
              active={pathname?.includes('/maintenance')}
            />
            <SidebarLink
              icon={Activity}
              label="Operations"
              href={`/${locale}/manage/${listingId}/operations`}
              active={pathname?.includes('/operations')}
            />
            {property.role !== 'staff' && (
              <SidebarLink
                icon={BarChart3}
                label="Finance"
                href={`/${locale}/manage/${listingId}/finance`}
                active={pathname?.includes('/finance')}
              />
            )}
            {property.role !== 'staff' && (
              <SidebarLink
                icon={Users}
                label="Staff Roster"
                href={`/${locale}/manage/${listingId}/staff`}
                active={pathname?.includes('/staff')}
              />
            )}
            {property.role !== 'staff' && (
              <SidebarLink
                icon={Settings}
                label="Listing Settings"
                href={`/${locale}/manage/${listingId}/settings`}
                active={pathname?.includes('/settings')}
              />
            )}

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
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-end px-8 gap-4">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-bold text-gray-900">Michael CampOwner</div>
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

function SidebarLink({ icon: Icon, label, href, active = false }: any) {
  return (
    <Link
      href={href || '#'}
      className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
        active
          ? 'bg-brand-600 text-white shadow-lg shadow-brand-100'
          : 'text-gray-500 hover:bg-gray-50 hover:text-brand-600'
      }`}
    >
      <Icon className="h-5 w-5" />
      {label}
    </Link>
  );
}
