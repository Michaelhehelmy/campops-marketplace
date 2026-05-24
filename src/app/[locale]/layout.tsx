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
import { getTenantFromHeaders, getTenantForHost } from '@/lib/tenant-context';
import { TenantProvider } from '@/lib/TenantContext';

export async function generateMetadata(
  { params }: { params: { locale: string } }
): Promise<Metadata> {
  const tenant = await getTenantFromHeaders();
  if (tenant) {
    return {
      title: tenant.name,
      description: `Book your stay at ${tenant.name}`,
    };
  }
  try {
    const settings = await db
      .prepare(
        `SELECT platform_name as "platformName" FROM marketplace_settings WHERE id = 'marketplace_settings'`
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

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = params;

  if (!locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();

  const tenant = await getTenantFromHeaders();
  const host = headers().get('x-forwarded-host') || headers().get('host') || '';
  const tenantFromHost = tenant ? null : await getTenantForHost(host);
  const resolvedTenant = tenant || tenantFromHost;

  let platformName = 'SinaiCamps Marketplace';

  if (!resolvedTenant) {
    try {
      const settings = await db
        .prepare(
          `SELECT platform_name as "platformName" FROM marketplace_settings WHERE id = 'marketplace_settings'`
        )
        .get();
      platformName = settings?.platformName ?? 'SinaiCamps Marketplace';
    } catch {
      // Keep default
    }
  }

  if (resolvedTenant) {
    const colors = resolvedTenant.branding?.colors || {
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
        <TenantProvider tenant={resolvedTenant}>
          <ShopfrontNav locale={locale} tenant={resolvedTenant} />
          <main className="min-h-[calc(100vh-64px)]">{children}</main>
          <ShopfrontFooter tenant={resolvedTenant} />
        </TenantProvider>
      </NextIntlClientProvider>
    );
  }

  return (
    <NextIntlClientProvider messages={messages}>
      <TenantProvider tenant={null}>
        <Nav locale={locale} />
        <main className="min-h-[calc(100vh-64px)]">{children}</main>
        <Footer platformName={platformName} />
      </TenantProvider>
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