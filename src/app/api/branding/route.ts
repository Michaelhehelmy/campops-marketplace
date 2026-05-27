import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { AuditService } from '@/lib/audit';
import { logger } from '@/lib/logger';

// Full branding configuration structure
export interface BrandingConfig {
  // Basic info
  name: string;
  description?: string;
  shortDescription?: string;
  tagline?: string;

  // Visual identity
  logo?: {
    url: string;
    darkUrl?: string;
    favicon?: string;
    appleTouchIcon?: string;
  };

  // Images
  images?: {
    hero?: string;
    banner?: string;
    gallery?: string[];
    thumbnail?: string;
    // Extended images
    dashboardHero?: string;
    hut?: string;
    kitchen?: string;
    desert?: string;
    stars?: string;
    sinaiLandscape?: string;
    sunset?: string;
    cabin?: string;
    mountain?: string;
    beach?: string;
    roomInterior?: string;
  };

  // Colors & theme
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textMuted: string;
  };

  // Typography
  typography?: {
    headingFont?: string;
    bodyFont?: string;
  };

  // Contact & social
  contact?: {
    email: string;
    phone?: string;
    website?: string;
    address?: string;
    social?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      youtube?: string;
      linkedin?: string;
      tiktok?: string;
    };
  };

  // SEO
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
    ogImage?: string;
  };

  // Theme mode
  theme?: {
    mode?: 'light' | 'dark' | 'auto';
    customCss?: string;
  };

  // Feature toggles
  features?: {
    bookings?: boolean;
    payments?: boolean;
    reviews?: boolean;
    loyalty?: boolean;
    pos?: boolean;
    excursions?: boolean;
    blog?: boolean;
    marketplace?: boolean;
    spa?: boolean;
    skiRentals?: boolean;
    wildlifeTours?: boolean;
  };

  // Labels & text
  labels?: {
    loginButton?: string;
    welcomeMessage?: string;
    bookNow?: string;
    contactUs?: string;
  };

  // Business info
  business?: {
    checkinTime?: string;
    checkoutTime?: string;
    timezone?: string;
    currency?: string;
    depositPercentage?: number;
  };

  // Location
  location?: {
    latitude?: number;
    longitude?: number;
    zoom?: number;
    directions?: string;
  };
}

function parseJson<T = any>(value: unknown): T {
  if (!value) return {} as T;

  if (typeof value === 'string') {
    try {
      return JSON.parse(value || '{}') as T;
    } catch {
      return {} as T;
    }
  }

  return value as T;
}

export async function GET(req: NextRequest) {
  const propertyId = req.headers.get('X-Property-Id') || req.nextUrl.searchParams.get('propertyId');
  const slug = req.nextUrl.searchParams.get('slug');
  const subdomain = req.nextUrl.searchParams.get('subdomain');

  try {
    let property: any;

    if (propertyId) {
      property = await db
        .prepare(
          `
        SELECT id, name, slug, subdomain, settings, is_active, owner_id
        FROM properties 
        WHERE id = $1
      `
        )
        .get(propertyId);
    } else if (slug) {
      property = await db
        .prepare(
          `
        SELECT id, name, slug, subdomain, settings, is_active, owner_id
        FROM properties 
        WHERE slug = $1 AND is_active = true
      `
        )
        .get(slug);
    } else if (subdomain) {
      property = await db
        .prepare(
          `
        SELECT id, name, slug, subdomain, settings, is_active, owner_id
        FROM properties 
        WHERE subdomain = $1 AND is_active = true
      `
        )
        .get(subdomain);
    } else {
      return NextResponse.json(
        {
          error: 'X-Property-Id header, propertyId, slug, or subdomain query param required',
        },
        { status: 400 }
      );
    }

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    if (!property.is_active) {
      return NextResponse.json({ error: 'Property is not active' }, { status: 403 });
    }

    const settings = parseJson<Record<string, any>>(property.settings);
    const storedBranding = parseJson<Record<string, any>>(property.branding);
    const brandingSource = settings.branding || storedBranding || {};
    const brandingLogo =
      brandingSource.logo ||
      (brandingSource.logoUrl ? { url: brandingSource.logoUrl } : null) ||
      null;

    // Get owner info for contact details
    const owner = await db
      .prepare(
        `
      SELECT email FROM users WHERE id = $1
    `
      )
      .get(property.owner_id);

    // Build comprehensive branding response
    const branding: BrandingConfig = {
      name: settings.branding?.name || property.name,
      description: settings.branding?.description || '',
      shortDescription: settings.branding?.shortDescription || '',
      tagline: settings.branding?.tagline || '',

      logo: brandingLogo || {
        url: '/default-logo.png',
        favicon: '/favicon.ico',
      },

      images: brandingSource.images || {
        hero: '/default-hero.jpg',
        gallery: [],
      },

      colors: brandingSource.colors ||
        settings.theme?.colors || {
          primary: '#0f172a',
          secondary: '#3b82f6',
          accent: '#10b981',
          background: '#ffffff',
          surface: '#f8fafc',
          text: '#1e293b',
          textMuted: '#64748b',
        },

      typography: brandingSource.typography || {
        headingFont: 'Inter',
        bodyFont: 'Inter',
      },

      contact: {
        email: brandingSource.contact?.email || owner?.email || '',
        phone: brandingSource.contact?.phone || '',
        website: brandingSource.contact?.website || '',
        address: brandingSource.contact?.address || '',
        social: brandingSource.contact?.social || {},
      },

      seo: brandingSource.seo || {
        title: brandingSource.name || property.name,
        description: brandingSource.description || '',
      },

      theme: brandingSource.theme || {
        mode: 'light',
        customCss: '',
      },

      features: brandingSource.features ||
        settings.features || {
          bookings: true,
          payments: true,
          reviews: true,
          loyalty: false,
          pos: false,
          excursions: true,
          blog: false,
          marketplace: false,
        },

      labels: brandingSource.labels || {
        loginButton: `Enter ${property.name}`,
        welcomeMessage: `Welcome to ${property.name}`,
        bookNow: 'Book Now',
        contactUs: 'Contact Us',
      },

      business: brandingSource.business || {
        checkinTime: '14:00',
        checkoutTime: '11:00',
        timezone: 'UTC',
        currency: 'USD',
        depositPercentage: 20,
      },

      location: brandingSource.location || {
        latitude: 0,
        longitude: 0,
        zoom: 12,
        directions: '',
      },
    };

    return NextResponse.json({
      id: property.id,
      name: property.name,
      slug: property.slug,
      subdomain: property.subdomain,
      ownerId: property.owner_id,
      branding,
      theme: brandingSource.theme || settings.theme || {},
      features: brandingSource.features || settings.features || {},
      plan: property.plan,
    });
  } catch (err: any) {
    logger.error('[Branding API] Error:', err);
    return errorResponse(err);
  }
}

// Update branding (owner or master admin)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { propertyId, slug, branding, userId, isMaster } = body;

    if (!propertyId && !slug) {
      return NextResponse.json({ error: 'propertyId or slug required' }, { status: 400 });
    }

    // Verify ownership or master access
    let property: any;
    if (propertyId) {
      property = await db
        .prepare(
          `
        SELECT id, owner_id, settings FROM properties WHERE id = $1
      `
        )
        .get(propertyId);
    } else {
      property = await db
        .prepare(
          `
        SELECT id, owner_id, settings FROM properties WHERE slug = $1
      `
        )
        .get(slug);
    }

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Check authorization
    if (!isMaster && property.owner_id !== userId) {
      // Check if user has admin role
      const userRole = await db
        .prepare(
          `
        SELECT role FROM user_roles WHERE user_id = $1 AND role = 'marketplace_master'
      `
        )
        .get(userId);

      if (!userRole) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    // Merge new branding with existing settings
    const existingSettings = parseJson<Record<string, any>>(property.settings);
    const existingBranding = parseJson<Record<string, any>>(property.branding);
    const incomingBranding = branding || {};
    const mergedLogo = {
      ...existingBranding.logo,
      ...existingSettings.branding?.logo,
      ...incomingBranding.logo,
      ...(incomingBranding.logoUrl ? { url: incomingBranding.logoUrl } : {}),
    };

    const updatedSettings = {
      ...existingSettings,
      branding: {
        ...existingBranding,
        ...existingSettings.branding,
        ...incomingBranding,
        // Deep merge for nested objects
        logo: mergedLogo,
        images: {
          ...existingBranding.images,
          ...existingSettings.branding?.images,
          ...incomingBranding.images,
        },
        colors: {
          ...existingBranding.colors,
          ...existingSettings.branding?.colors,
          ...incomingBranding.colors,
        },
        typography: {
          ...existingBranding.typography,
          ...existingSettings.branding?.typography,
          ...incomingBranding.typography,
        },
        contact: {
          ...existingBranding.contact,
          ...existingSettings.branding?.contact,
          ...incomingBranding.contact,
          social: {
            ...existingBranding.contact?.social,
            ...existingSettings.branding?.contact?.social,
            ...incomingBranding.contact?.social,
          },
        },
        seo: {
          ...existingBranding.seo,
          ...existingSettings.branding?.seo,
          ...incomingBranding.seo,
        },
        theme: {
          ...existingBranding.theme,
          ...existingSettings.branding?.theme,
          ...incomingBranding.theme,
        },
        features: {
          ...existingBranding.features,
          ...existingSettings.branding?.features,
          ...incomingBranding.features,
        },
        labels: {
          ...existingBranding.labels,
          ...existingSettings.branding?.labels,
          ...incomingBranding.labels,
        },
        business: {
          ...existingBranding.business,
          ...existingSettings.branding?.business,
          ...incomingBranding.business,
        },
        location: {
          ...existingBranding.location,
          ...existingSettings.branding?.location,
          ...incomingBranding.location,
        },
      },
    };

    // Update property
    await db
      .prepare(
        `
      UPDATE properties 
      SET settings = $1,
          branding = $2,
          name = COALESCE($3, name)
      WHERE id = $4
    `
      )
      .run(
        JSON.stringify(updatedSettings),
        JSON.stringify(updatedSettings.branding),
        incomingBranding.name,
        property.id
      );

    AuditService.log({
      userId: userId || 'system',
      action: 'branding.update',
      resource: 'property',
      resourceId: property.id,
      details: { slug, brandingKeys: Object.keys(incomingBranding) },
    });

    return NextResponse.json({
      success: true,
      message: 'Branding updated successfully',
      propertyId: property.id,
    });
  } catch (err: any) {
    logger.error('[Branding API] PUT Error:', err);
    return errorResponse(err);
  }
}
