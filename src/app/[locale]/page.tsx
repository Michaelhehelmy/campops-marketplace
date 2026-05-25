import { PluginShell } from '@/app/PluginShell';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import HeroSection from '@/components/homepage/HeroSection';
import FeaturedListings from '@/components/homepage/FeaturedListings';
import Categories from '@/components/homepage/Categories';
import ListingDetailView from '@/components/ListingDetailView';
import { getTenantListing } from '@/lib/api';
import { getTenantFromHeaders } from '@/lib/tenant-context';
import { getSqlite } from '@/lib/db';
import { PostQuery, type Post } from '@/lib/PostQuery';
import React from 'react';

interface Props {
  params: { locale: string };
  searchParams: { checkIn?: string; checkOut?: string; currency?: string };
}

async function getHomepageConfig() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/public/homepage-config`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('Failed to fetch config');
    return await res.json();
  } catch (error) {
    return {
      sections: ['hero', 'featured-listings', 'categories'],
      roleBased: { guest: {}, admin: {}, master: {} },
    };
  }
}

export default async function HomePage({ params, searchParams }: Props) {
  const { locale } = params;
  const { checkIn, checkOut, currency = 'USD' } = searchParams;

  // Runtime tenant detection via middleware headers (set by middleware.ts)
  const tenant = await getTenantFromHeaders();

  // Fallback: build-time env var for single-tenant deployments
  const tenantId = tenant?.id || process.env.NEXT_PUBLIC_TENANT_ID;

  // Mode 1: Tenant-specific listing view
  if (tenantId) {
    try {
      const { property, room_types } = await getTenantListing(
        tenantId,
        checkIn,
        checkOut,
        currency
      );
      return (
        <PluginRegistryProvider>
          <ListingDetailView
            property={property}
            room_types={room_types}
            locale={locale}
            checkIn={checkIn}
            checkOut={checkOut}
            currency={currency}
          />
        </PluginRegistryProvider>
      );
    } catch (error) {
      console.error('[HomePage] Tenant lookup failed:', error);
    }
  }

  // Mode 2: Standard Marketplace Frontend
  const config = await getHomepageConfig();

  // Pre-fetch featured listings server-side to avoid client waterfall.
  let featuredListings: Post[] = [];
  try {
    const db = getSqlite();
    const q = new PostQuery(db);
    featuredListings = await q.globalQuery({
      postType: 'listing',
      status: 'publish',
      meta: [{ key: 'is_featured', value: '1' }],
      orderBy: 'menu_order',
      order: 'ASC',
      limit: 8,
      includeMeta: true,
    });
  } catch {
    // DB may not be seeded; fall back to client-side fetch in FeaturedListings
  }

  const fallbackMap: Record<string, React.ReactNode> = {
    hero: <HeroSection locale={locale} />,
    'featured-listings': (
      <FeaturedListings
        locale={locale}
        initialListings={featuredListings.length > 0 ? featuredListings : undefined}
      />
    ),
    categories: <Categories locale={locale} />,
  };

  return (
    <PluginRegistryProvider>
      <main className="py-8">
        <PluginShell name="public.homepage" props={{ locale }} fallback={null} />
        <PluginShell name="public.search" props={{ locale }} fallback={null} />
        {config.sections.map((sectionName: string) => (
          <PluginShell
            key={sectionName}
            name={`homepage.${sectionName}`}
            props={{ locale }}
            fallback={fallbackMap[sectionName] || null}
          />
        ))}
      </main>
    </PluginRegistryProvider>
  );
}
