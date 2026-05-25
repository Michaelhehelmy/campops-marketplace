import Link from 'next/link';
import { MapPin, Users, Download, ArrowLeft } from 'lucide-react';
import { PluginShell } from '@/app/PluginShell';
import BookingFallback from '@/components/BookingFallback';
import type { Post } from '@/lib/PostQuery';

interface Props {
  post: Post;
  roomTypes?: any[];
  locale: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
  showBreadcrumb?: boolean;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function SingleListing({
  post,
  roomTypes = [],
  locale,
  checkIn,
  checkOut,
  currency = 'USD',
  showBreadcrumb = true,
}: Props) {
  const m = post.meta ?? {};
  let settings: any = {};
  try {
    if (m.settings) settings = JSON.parse(m.settings);
  } catch {}
  const branding = settings.branding || {};
  const headerText = branding.labels?.welcomeMessage || branding.tagline || post.postTitle;

  let amenities: string[] = [];
  try {
    if (m.amenities) amenities = JSON.parse(m.amenities);
  } catch {}

  return (
    <div
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      data-testid="listing-branding-shell"
    >
      {showBreadcrumb && (
        <Link
          href={`/${locale}/search`}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[var(--tenant-primary)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to search
        </Link>
      )}

      <div
        className="h-64 md:h-80 rounded-2xl flex items-center justify-center mb-8 text-white overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(135deg, var(--tenant-primary), var(--tenant-secondary))',
        }}
      >
        <div className="text-center px-6" data-testid="listing-brand-header">
          {branding.logo?.url && (
            <img
              src={branding.logo.url}
              alt={`${post.postTitle} logo`}
              data-testid="listing-logo"
              className="h-16 w-auto mx-auto mb-4 object-contain"
            />
          )}
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{headerText}</h1>
          <p className="mt-3 text-white/90 max-w-2xl mx-auto">
            {branding.shortDescription ||
              m.short_description ||
              post.postContent ||
              'White-labeled booking experience'}
          </p>
        </div>
      </div>

      <PluginShell
        name="listing.header"
        props={{ listingId: post.id }}
        fallback={<div className="hidden" data-pwa-preview-check="true" />}
      />

      <div
        data-testid="pwa-install-banner"
        style={{ display: 'none' }}
        className="bg-[var(--tenant-primary)] text-white rounded-xl p-4 mb-6 items-center justify-between"
        id="pwa-banner-fallback"
      >
        <div className="flex items-center gap-3">
          <Download className="w-5 h-5" />
          <div>
            <p className="font-bold">Install App</p>
            <p className="text-sm text-brand-100">
              Add to your home screen for the best experience
            </p>
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

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <MapPin className="w-4 h-4" />
            <span>{[m.city, m.country].filter(Boolean).join(', ')}</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">{post.postTitle}</h2>
          {post.postContent && <p className="mt-3 text-gray-600 max-w-2xl">{post.postContent}</p>}
        </div>
      </div>

      <PluginShell
        name="public.booking"
        props={{
          listingId: post.id,
          propertyName: post.postTitle,
          checkIn,
          checkOut,
          currency,
        }}
        fallback={
          <BookingFallback
            listingId={post.id}
            propertyName={post.postTitle}
            checkIn={checkIn}
            checkOut={checkOut}
            locale={locale}
          />
        }
      />

      <PluginShell
        name="public.listing-detail"
        props={{ slug: post.postSlug, listingId: post.id }}
        fallback={null}
      />

      <h2 className="text-xl font-semibold text-gray-900 mt-6 mb-4">Available Units</h2>
      {roomTypes.length === 0 ? (
        <p className="text-gray-400 py-8 text-center">No rooms available</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roomTypes.map((rt: any) => {
            const roomPrice =
              rt.displayPrice ??
              rt.base_price ??
              (typeof rt.base_price_cents === 'number' ? rt.base_price_cents / 100 : 0);
            const roomCurrency = rt.displayCurrency ?? currency;

            return (
              <div
                key={rt.id}
                data-testid={`room-item-${rt.id}`}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:border-[var(--tenant-primary)] transition-colors"
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
                    <p className="text-xs text-gray-400">/ night</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
                  <Users className="w-4 h-4" />
                  <span>Up to {rt.capacity} guests</span>
                </div>

                {checkIn && checkOut ? (
                  <Link
                    href={`/${locale}/book/summary?propertyId=${post.id}&roomTypeId=${rt.id}&checkIn=${checkIn}&checkOut=${checkOut}&currency=${currency}&roomName=${encodeURIComponent(rt.name)}&propertyName=${encodeURIComponent(post.postTitle)}&price=${roomPrice}&priceCurrency=${roomCurrency}`}
                    data-testid={`book-button-${rt.id}`}
                    className="block w-full text-center bg-[var(--tenant-primary)] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--tenant-secondary)] transition-colors"
                  >
                    Book Now
                  </Link>
                ) : (
                  <Link
                    href={`/${locale}/search`}
                    className="block w-full text-center border border-[var(--tenant-primary)] text-[var(--tenant-primary)] py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--tenant-primary)]/5 transition-colors"
                  >
                    Check Availability
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
