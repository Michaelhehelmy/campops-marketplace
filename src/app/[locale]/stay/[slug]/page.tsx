import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { getProperty } from '@/lib/api';
import { getSqlite } from '@/lib/db';
import { PostQuery, Post } from '@/lib/PostQuery';
import { ThemeLoader } from '@/lib/ThemeLoader';
import { OptionsRepository } from '@/lib/OptionsRepository';
import { Check } from 'lucide-react';
import SingleListing from '@themes/camp-classic/templates/single-listing';
import { Loader2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string; slug: string };
  searchParams: { checkIn?: string; checkOut?: string; currency?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  let title = '';
  let description = '';

  try {
    const postQueryData = await loadViaPostQuery(slug);
    if (postQueryData) {
      title = postQueryData.post.postTitle ?? '';
      description = postQueryData.post.postContent ?? '';
    } else {
      const data = await getProperty(slug);
      if (data?.property) {
        title = data.property.name ?? '';
        description = data.property.description ?? '';
      }
    }
  } catch {
    // Fall through to defaults
  }

  return {
    title: title || 'Property Details',
    description: description || 'View property details and book your stay.',
    openGraph: title
      ? {
          title,
          description,
          images: [{ url: '/og-image.png', width: 1200, height: 630 }],
        }
      : undefined,
  };
}

async function loadViaPostQuery(slug: string): Promise<{ post: Post; roomTypes: any[] } | null> {
  try {
    const db = getSqlite();

    // First try via posts table
    const post = db
      .prepare(
        `
        SELECT p.* FROM posts p
        JOIN sites s ON s.id = p.site_id
        WHERE p.post_slug = ? AND p.post_type = 'listing' AND p.post_status = 'publish' AND s.is_active = 1
        LIMIT 1
      `
      )
      .get(slug) as any;

    if (post) {
      const q = new PostQuery(db);
      const fullPost = q.queryOne({
        siteId: post.site_id,
        postType: 'listing',
        postSlug: slug,
        status: 'publish',
        includeMeta: true,
      });

      if (!fullPost) return null;

      let roomTypes: any[] = [];
      try {
        if (fullPost.meta?.room_types) roomTypes = JSON.parse(fullPost.meta.room_types);
      } catch {}

      return { post: fullPost, roomTypes };
    }

    // Fallback: find property via properties table, look up its site
    const property = db
      .prepare('SELECT * FROM properties WHERE slug = ? AND is_active = 1 LIMIT 1')
      .get(slug) as any;

    if (!property) return null;

    const site = db
      .prepare('SELECT id, slug, name, plan FROM sites WHERE id = ? AND is_active = 1 LIMIT 1')
      .get(property.site_id ?? property.owner_id) as any;

    if (!site) return null;

    const q = new PostQuery(db);
    const postViaSite = q.queryOne({
      siteId: site.id,
      postType: 'listing',
      postSlug: slug,
      status: 'publish',
      includeMeta: true,
    });

    let roomTypes: any[] = [];
    try {
      if (postViaSite?.meta?.room_types) roomTypes = JSON.parse(postViaSite.meta.room_types);
    } catch {}

    if (postViaSite) return { post: postViaSite, roomTypes };

    // Last resort: build a Post from the raw property row
    const fallbackPost: Post = {
      id: property.id,
      siteId: site.id,
      postType: 'listing',
      postStatus: 'publish',
      postSlug: property.slug,
      postTitle: property.name,
      postContent: property.description ?? null,
      authorId: null,
      parentId: null,
      menuOrder: 0,
      createdAt: null,
      updatedAt: null,
      meta: {
        settings: property.settings ?? null,
        city: property.city ?? null,
        country: property.country ?? null,
        amenities: property.amenities
          ? typeof property.amenities === 'string'
            ? property.amenities
            : JSON.stringify(property.amenities)
          : null,
        rating: property.rating != null ? String(property.rating) : null,
      },
    };

    try {
      if (property.room_types) {
        roomTypes =
          typeof property.room_types === 'string'
            ? JSON.parse(property.room_types)
            : property.room_types;
      }
    } catch {}

    return { post: fallbackPost, roomTypes };
  } catch (err) {
    console.error('[loadViaPostQuery] Error:', err);
    return null;
  }
}

export default async function PropertyPage({ params, searchParams }: Props) {
  const { locale, slug } = params;
  const { checkIn, checkOut, currency = 'USD' } = searchParams;
  const t = await getTranslations('property');

  let postQueryData = await loadViaPostQuery(slug);

  if (!postQueryData) {
    try {
      const data = await getProperty(slug, checkIn, checkOut, currency);
      if (!data) notFound();

      const { property, room_types: roomTypes } = data;

      const db = getSqlite();

      const post: Post = {
        id: property.id ?? '',
        siteId: property.site_id ?? property.siteId ?? '',
        postType: 'listing',
        postStatus: 'publish',
        postSlug: property.slug ?? slug,
        postTitle: property.name ?? '',
        postContent: property.description ?? null,
        authorId: null,
        parentId: null,
        menuOrder: 0,
        createdAt: null,
        updatedAt: null,
        meta: {
          settings:
            typeof property.settings === 'string'
              ? property.settings
              : JSON.stringify(property.settings ?? {}),
          city: property.city ?? null,
          country: property.country ?? null,
          amenities: Array.isArray(property.amenities)
            ? JSON.stringify(property.amenities)
            : (property.amenities ?? null),
          rating: property.rating != null ? String(property.rating) : null,
        },
      };

      return (
        <PropertyPageInner
          post={post}
          roomTypes={roomTypes}
          slug={slug}
          locale={locale}
          checkIn={checkIn}
          checkOut={checkOut}
          currency={currency}
        />
      );
    } catch {
      notFound();
    }
  }

  return (
    <PropertyPageInner
      post={postQueryData.post}
      roomTypes={postQueryData.roomTypes}
      slug={slug}
      locale={locale}
      checkIn={checkIn}
      checkOut={checkOut}
      currency={currency}
    />
  );
}

async function PropertyPageInner({
  post,
  roomTypes,
  slug,
  locale,
  checkIn,
  checkOut,
  currency,
}: {
  post: Post;
  roomTypes: any[];
  slug: string;
  locale: string;
  checkIn?: string;
  checkOut?: string;
  currency?: string;
}) {
  const db = getSqlite();
  const site = db
    .prepare('SELECT id FROM sites WHERE id = ? AND is_active = 1 LIMIT 1')
    .get(post.siteId) as { id: string } | undefined;

  let themeId = 'camp-classic';
  if (site) {
    const opts = new OptionsRepository(db);
    const activeTheme = opts.getOption(site.id, 'active_theme');
    if (activeTheme) themeId = activeTheme;
  }

  const resolved = ThemeLoader.resolveTemplate(themeId, 'listing');

  const themeCssVars: Record<string, string> = {
    '--tenant-primary': '#16a34a',
    '--tenant-secondary': '#22c55e',
    '--tenant-accent': '#10b981',
  };

  const m = post.meta ?? {};
  let settings: any = {};
  try {
    if (m.settings) settings = JSON.parse(m.settings);
  } catch {}
  const branding = settings.branding || {};
  if (branding.colors?.primary) themeCssVars['--tenant-primary'] = branding.colors.primary;
  if (branding.colors?.secondary) themeCssVars['--tenant-secondary'] = branding.colors.secondary;
  if (branding.colors?.accent) themeCssVars['--tenant-accent'] = branding.colors.accent;

  // Parse amenities
  let amenities: string[] = [];
  try {
    if (m.amenities) {
      const parsed = typeof m.amenities === 'string' ? JSON.parse(m.amenities) : m.amenities;
      if (Array.isArray(parsed)) amenities = parsed;
    }
  } catch {}

  // Parse rating
  const rating = m.rating ? parseFloat(m.rating) : null;

  // Build JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LodgingBusiness',
    name: post.postTitle,
    description: post.postContent ?? undefined,
    image: branding.logo?.url ?? undefined,
    address: {
      '@type': 'PostalAddress',
      addressLocality: m.city ?? undefined,
      addressCountry: m.country ?? undefined,
    },
    ...(rating != null && { aggregateRating: { '@type': 'AggregateRating', ratingValue: rating } }),
  };

  return (
    <PluginRegistryProvider>
      <div style={themeCssVars as React.CSSProperties}>
        {/* JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        {/* Amenities section */}
        {amenities.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {amenities.map((amenity, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Check className="w-4 h-4 text-green-600 shrink-0" />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Rating display */}
        {rating != null && rating > 0 && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: Math.round(rating) }, (_, i) => (
                <svg
                  key={i}
                  className="w-5 h-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-sm text-gray-500 ml-1">({rating.toFixed(1)})</span>
            </div>
          </div>
        )}

        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          }
        >
          <SingleListing
            post={post}
            roomTypes={roomTypes}
            locale={locale}
            checkIn={checkIn}
            checkOut={checkOut}
            currency={currency}
            showBreadcrumb={true}
          />
        </Suspense>
      </div>
    </PluginRegistryProvider>
  );
}
