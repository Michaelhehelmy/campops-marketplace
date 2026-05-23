import type { Metadata, ResolvingMetadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n/request';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { Nav } from '@/components/Nav';
import { ShopfrontNav } from '@/components/ShopfrontNav';
import { ShopfrontFooter } from '@/components/ShopfrontFooter';

export async function generateMetadata(
  { params }: { params: { locale: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const cleanHostname = host.split(':')[0].toLowerCase().replace(/^www\./, '');
  try {
    const property = (await db
      .prepare(
        `SELECT name FROM properties WHERE is_active = true AND (custom_domain = ? OR COALESCE(json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.customDomain'), '') = ?) LIMIT 1`
      )
      .get(cleanHostname, cleanHostname)) as any;
    if (property) {
      return {
        title: property.name,
        description: `Book your stay at ${property.name}`,
      };
    }
  } catch {}
  // Fallback to platform name from marketplace settings for the marketplace itself
  try {
    const settings = await db
      .prepare(
        `
        SELECT platform_name as "platformName"
        FROM marketplace_settings
        WHERE id = 'marketplace_settings'
        `
      )
      .get();
    const platformName = settings?.platformName ?? 'SinaiCamps Marketplace';
    return {
      title: platformName,
      description: 'Find and book your perfect camp stay',
    };
  } catch {
    return {
      title: 'SinaiCamps Marketplace',
      description: 'Find and book your perfect camp stay',
    };
  }
}

interface Props {
  children: React.ReactNode;
  params: { locale: string };
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

const parseJSON = (val: any) => {
  if (!val) return {};
  if (typeof val === 'string') {
    try {
      return JSON.parse(val || '{}');
    } catch {
      return {};
    }
  }
  return val;
};

async function getTenantForHost(host: string) {
  if (!host) return null;
  const cleanHostname = host.split(':')[0].toLowerCase().replace(/^www\./, '');
  const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  try {
    // 1. Custom Domain Match
    let property = (await db
      .prepare(
        `
        SELECT id, slug, name, city, country, branding, settings, plan, custom_domain, domain_verified
        FROM properties
        WHERE is_active = true
          AND (
            custom_domain = ?
            OR COALESCE(json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.customDomain'), '') = ?
          )
        LIMIT 1
        `
      )
      .get(cleanHostname, cleanHostname)) as any;

    // 2. Subdomain Match
    if (!property && cleanHostname.endsWith(`.${BASE_DOMAIN}`)) {
      const sub = cleanHostname.slice(0, -(BASE_DOMAIN.length + 1));
      property = (await db
        .prepare(
          `
          SELECT id, slug, name, city, country, branding, settings, plan, custom_domain, domain_verified
          FROM properties
          WHERE is_active = true AND subdomain = ?
          LIMIT 1
          `
        )
        .get(sub)) as any;
    }

    if (property) {
      return {
        id: property.id,
        slug: property.slug,
        name: property.name,
        city: property.city,
        country: property.country,
        plan: property.plan,
        branding: parseJSON(property.branding),
        settings: parseJSON(property.settings),
      };
    }
  } catch (err) {
    console.error('[Layout Tenant Resolution] Error:', err);
  }
  return null;
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') || headerList.get('host') || '';
  const tenant = await getTenantForHost(host);
  let platformName = 'SinaiCamps Marketplace';

  // Fetch platform name for the marketplace itself (when no tenant)
  if (!tenant) {
    try {
      const settings = await db
        .prepare(
          `
          SELECT platform_name as "platformName"
          FROM marketplace_settings
          WHERE id = 'marketplace_settings'
          `
        )
        .get();
      platformName = settings?.platformName ?? 'SinaiCamps Marketplace';
    } catch {
      // Keep default
    }
  }

  if (tenant) {
    const colors = tenant.branding?.colors || {
      primary: '#0f172a',
      secondary: '#3b82f6',
      accent: '#10b981',
    };

    return (
      <NextIntlClientProvider messages={messages}>
        <style
          dangerouslySetInnerHTML={{
            __html: `
           :root {
             --tenant-primary: ${colors.primary || '#0f172a'};
             --tenant-secondary: ${colors.secondary || '#3b82f6'};
             --tenant-accent: ${colors.accent || '#10b981'};
           }
         `,
          }}
        />
        <ShopfrontNav locale={locale} tenant={tenant} />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <ShopfrontFooter tenant={tenant} />
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <Nav locale={locale} />
      <main className="min-h-[calc(100vh-64px)]">{children}</main>
      <Footer platformName={platformName} />
    </NextIntlClientProvider>
  );
}

function Footer({ platformName }: { platformName: string }) {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <p>© {new Date().getFullYear()} {platformName}. All rights reserved.</p>
      </div>
    </footer>
  );
}