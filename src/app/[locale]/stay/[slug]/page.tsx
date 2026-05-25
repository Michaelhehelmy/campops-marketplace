import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { getProperty } from '@/lib/api';
import { getSqlite } from '@/lib/db';
import { PostQuery, Post } from '@/lib/PostQuery';
import { ThemeLoader } from '@/lib/ThemeLoader';
import { OptionsRepository } from '@/lib/OptionsRepository';
import SingleListing from '@themes/camp-classic/templates/single-listing';

export const dynamic = 'force-dynamic';

interface Props {
  params: { locale: string; slug: string };
  searchParams: { checkIn?: string; checkOut?: string; currency?: string };
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

  return (
    <PluginRegistryProvider>
      <div style={themeCssVars as React.CSSProperties}>
        <SingleListing
          post={post}
          roomTypes={roomTypes}
          locale={locale}
          checkIn={checkIn}
          checkOut={checkOut}
          currency={currency}
          showBreadcrumb={true}
        />
      </div>
    </PluginRegistryProvider>
  );
}
