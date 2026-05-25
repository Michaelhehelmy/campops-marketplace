import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { getTranslations } from 'next-intl/server';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { TenantHomePage } from '@/components/tenant/TenantHomePage';
import { TenantAboutPage } from '@/components/tenant/TenantAboutPage';
import { TenantServicesPage } from '@/components/tenant/TenantServicesPage';
import { TenantGalleryPage } from '@/components/tenant/TenantGalleryPage';
import { TenantRoomsPage } from '@/components/tenant/TenantRoomsPage';
import { TenantContactPage } from '@/components/tenant/TenantContactPage';

interface Props {
  params: { locale: string; slug: string[] | undefined; tenantSlug: string };
}

interface TenantData {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string;
  country: string;
  branding: any;
  settings: any;
  plan: string;
}

function resolveTenantBySlug(tenantSlug: string): TenantData | null {
  try {
    const row = db
      .prepare(
        `SELECT id, slug, name, description, city, country, branding, settings, plan
         FROM properties WHERE slug = ? AND is_active = 1 LIMIT 1`
      )
      .get(tenantSlug) as any;
    if (!row) return null;
    const parseJSON = (val: any) => {
      if (!val) return {};
      if (typeof val === 'string') { try { return JSON.parse(val); } catch { return {}; } }
      return val;
    };
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      city: row.city ?? '',
      country: row.country ?? '',
      branding: parseJSON(row.branding),
      settings: parseJSON(row.settings),
      plan: row.plan ?? 'basic',
    };
  } catch {
    return null;
  }
}

const PAGE_ROUTES: Record<string, React.ComponentType<{ tenant: TenantData; locale: string }>> = {
  about: TenantAboutPage,
  services: TenantServicesPage,
  gallery: TenantGalleryPage,
  rooms: TenantRoomsPage,
  'room-types': TenantRoomsPage,
  contact: TenantContactPage,
};

export default async function TenantPage({ params, searchParams }: Props & { searchParams: any }) {
  const { locale, tenantSlug, slug } = params;
  const tenant = resolveTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  const t = await getTranslations('tenant');

  const pageSlug = slug?.[0];
  const PageComponent = pageSlug ? PAGE_ROUTES[pageSlug] : undefined;

  if (pageSlug && !PageComponent) notFound();

  const themeCssVars: Record<string, string> = {
    '--tenant-primary': '#16a34a',
    '--tenant-secondary': '#22c55e',
    '--tenant-accent': '#10b981',
  };
  const b = tenant.branding?.colors || {};
  if (b.primary) themeCssVars['--tenant-primary'] = b.primary;
  if (b.secondary) themeCssVars['--tenant-secondary'] = b.secondary;
  if (b.accent) themeCssVars['--tenant-accent'] = b.accent;

  if (PageComponent) {
    return (
      <PluginRegistryProvider>
        <div className="min-h-screen bg-zinc-950" style={themeCssVars as React.CSSProperties}>
          <PageComponent tenant={tenant} locale={locale} />
        </div>
      </PluginRegistryProvider>
    );
  }

  return (
    <PluginRegistryProvider>
      <div className="min-h-screen bg-zinc-950" style={themeCssVars as React.CSSProperties}>
        <TenantHomePage tenant={tenant} locale={locale} />
      </div>
    </PluginRegistryProvider>
  );
}
