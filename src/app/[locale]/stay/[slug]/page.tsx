import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MapPin, Users, ArrowLeft, Download } from 'lucide-react';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';
import { getProperty } from '@/lib/api';
import BookingFallback from '@/components/BookingFallback';
import { getSqlite } from '@/lib/db';
import { PostQuery } from '@/lib/PostQuery';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string; slug: string };
  searchParams: { checkIn?: string; checkOut?: string; currency?: string };
}

/**
 * Attempt to load listing data via PostQuery (Posts-native path).
 * Resolves: site.slug → site.id → PostQuery.queryOne({ postSlug })
 * Returns null if not found so the caller can fall back to getProperty().
 */
async function loadViaPostQuery(
  slug: string
): Promise<{ property: Record<string, any>; room_types: any[] } | null> {
  try {
    const db = getSqlite();
    const site = db
      .prepare('SELECT id, slug, name, plan FROM sites WHERE slug = ? AND is_active = 1 LIMIT 1')
      .get(slug) as { id: string; slug: string; name: string; plan: string } | undefined;

    if (!site) return null;

    const q = new PostQuery(db);
    const post = q.queryOne({
      siteId: site.id,
      postType: 'listing',
      postSlug: slug,
      status: 'publish',
      includeMeta: true,
    });

    if (!post) return null;

    const m = post.meta ?? {};
    let amenities: string[] = [];
    try {
      if (m.amenities) amenities = JSON.parse(m.amenities);
    } catch {
      amenities = [];
    }

    const property = {
      id: post.id,
      slug: post.postSlug ?? slug,
      name: post.postTitle,
      description: post.postContent ?? '',
      city: m.city ?? null,
      country: m.country ?? null,
      settings: m.settings ?? null,
      plan: site.plan,
      amenities,
      rating: parseFloat(m.rating ?? '0') || 0,
    };

    const room_types = (() => {
      try {
        return m.room_types ? JSON.parse(m.room_types) : [];
      } catch {
        return [];
      }
    })();

    return { property, room_types };
  } catch {
    return null;
  }
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  const { checkIn, checkOut, currency = 'USD' } = searchParams;
  const t = await getTranslations('property');

  // Primary path: Posts-native via PostQuery (site.slug → posts table)
  let postQueryData = await loadViaPostQuery(slug);

  // Fallback: legacy getProperty() for sites not yet migrated to posts
  let data: Awaited<ReturnType<typeof getProperty>> | null = null;
  if (!postQueryData) {
    try {
      data = await getProperty(slug, checkIn, checkOut, currency);
    } catch {
      notFound();
    }
  }

  if (!postQueryData && !data) notFound();

  const { property, room_types } = (postQueryData ?? data)!;
  const settings =
    typeof property.settings === 'string'
      ? JSON.parse(property.settings || '{}')
      : property.settings || {};
  const branding = settings.branding || {};
  const listingStyle = {
    ['--listing-primary' as any]: branding.colors?.primary || '#16a34a',
    ['--listing-secondary' as any]: branding.colors?.secondary || '#22c55e',
    ['--listing-accent' as any]: branding.colors?.accent || '#10b981',
  };
  const headerText = branding.labels?.welcomeMessage || branding.tagline || property.name;

  return (
    <PluginRegistryProvider>
      <div
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
        style={listingStyle as React.CSSProperties}
        data-testid="listing-branding-shell"
      >
        {/* Breadcrumb */}
        <Link
          href={`/${locale}/search`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </Link>

        {/* Hero */}
        <div
          className="h-64 md:h-80 rounded-2xl flex items-center justify-center mb-8 text-white overflow-hidden"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--listing-primary), var(--listing-secondary))',
          }}
        >
          <div className="text-center px-6" data-testid="listing-brand-header">
            {branding.logo?.url && (
              <img
                src={branding.logo.url}
                alt={`${property.name} logo`}
                data-testid="listing-logo"
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
            )}
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{headerText}</h1>
            <p className="mt-3 text-white/90 max-w-2xl mx-auto">
              {branding.shortDescription ||
                property.description ||
                'White-labeled booking experience'}
            </p>
          </div>
        </div>

        {/* PWA Banner Slot */}
        <PluginShell
          name="listing.header"
          props={{ listingId: property.id }}
          fallback={<div className="hidden" data-pwa-preview-check="true" />}
        />

        {/* PWA Banner Fallback - shows when pwa-preview flag is set */}
        <div
          data-testid="pwa-install-banner"
          style={{ display: 'none' }}
          className="bg-brand-600 text-white rounded-xl p-4 mb-6 items-center justify-between"
          id="pwa-banner-fallback"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5" />
            <div>
              <p className="font-bold">{t('installApp')}</p>
              <p className="text-sm text-brand-100">{t('installDesc')}</p>
            </div>
          </div>
          <button className="bg-white text-brand-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-brand-50">
            Install
          </button>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              var pwaPreview = localStorage.getItem('pwa-preview');
              var banner = document.getElementById('pwa-banner-fallback');
              if (pwaPreview === 'true' && banner) {
                banner.style.display = 'flex';
              }
            })();
          `,
          }}
        />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
              <MapPin className="w-4 h-4" />
              <span>{[property.city, property.country].filter(Boolean).join(', ')}</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">{property.name}</h2>
            {property.description && (
              <p className="mt-3 text-gray-600 max-w-2xl">{property.description}</p>
            )}
          </div>
        </div>

        {/* Booking Plugin Slot - visibility controlled client-side via plugin state */}
        <PluginShell
          name="public.booking"
          props={{
            listingId: property.id,
            propertyName: property.name,
            checkIn,
            checkOut,
            currency,
          }}
          fallback={
            <BookingFallback
              listingId={property.id}
              propertyName={property.name}
              checkIn={checkIn}
              checkOut={checkOut}
              locale={locale}
            />
          }
        />

        {/* Resource plugin: public.listing-detail slot */}
        <PluginShell
          name="public.listing-detail"
          props={{ slug: property.slug ?? slug, listingId: property.id }}
          fallback={null}
        />

        <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">{t('roomTypes')}</h2>
        {room_types.length === 0 ? (
          <p className="text-gray-400 py-8 text-center">{t('noRoomsAvailable')}</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {room_types.map((rt: any) => {
              const roomPrice =
                rt.displayPrice ??
                rt.base_price ??
                (typeof rt.base_price_cents === 'number' ? rt.base_price_cents / 100 : 0);
              const roomCurrency = rt.displayCurrency ?? currency;

              return (
                <div
                  key={rt.id}
                  data-testid={`room-item-${rt.id}`}
                  className="bg-white border border-gray-200 rounded-xl p-5 hover:border-brand-400 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{rt.name}</h3>
                      {rt.description && (
                        <p className="text-sm text-gray-500 mt-1">{rt.description}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">
                        {formatPrice(roomPrice, roomCurrency)}
                      </p>
                      <p className="text-xs text-gray-400">{t('perNight')}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                    <Users className="w-4 h-4" />
                    <span>{t('capacity', { n: rt.capacity })}</span>
                  </div>

                  {checkIn && checkOut ? (
                    <Link
                      href={`/${locale}/book/summary?propertyId=${property.id}&roomTypeId=${rt.id}&checkIn=${checkIn}&checkOut=${checkOut}&currency=${currency}&roomName=${encodeURIComponent(rt.name)}&propertyName=${encodeURIComponent(property.name)}&price=${roomPrice}&priceCurrency=${roomCurrency}`}
                      data-testid={`book-button-${rt.id}`}
                      className="block w-full text-center bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors"
                    >
                      {t('bookNow')}
                    </Link>
                  ) : (
                    <Link
                      href={`/${locale}/search`}
                      className="block w-full text-center border border-brand-600 text-brand-600 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-50 transition-colors"
                    >
                      {t('checkAvailability')}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PluginRegistryProvider>
  );
}
