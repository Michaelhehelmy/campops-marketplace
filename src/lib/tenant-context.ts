import { headers } from 'next/headers';
import { db } from '@/lib/db';

export interface TenantInfo {
  id: string;
  slug: string;
  name: string;
  city: string;
  country: string;
  plan: string;
  branding: any;
  settings: any;
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

export async function getTenantFromHeaders(): Promise<TenantInfo | null> {
  try {
    const headerList = headers();
    const propertyId = headerList.get('x-tenant-property-id');
    const slug = headerList.get('x-tenant-slug');
    const mainDomain = headerList.get('x-main-domain');

    if (propertyId && slug && mainDomain !== '1') {
      const row = (await db
        .prepare(
          `SELECT id, slug, name, city, country, branding, settings, plan FROM properties WHERE id = ? AND is_active = true LIMIT 1`
        )
        .get(propertyId)) as any;

      if (row) {
        return {
          id: row.id,
          slug: row.slug,
          name: row.name,
          city: row.city,
          country: row.country,
          plan: row.plan,
          branding: parseJSON(row.branding),
          settings: parseJSON(row.settings),
        };
      }
    }
  } catch {
    // Headers not available or DB error — fall through
  }
  return null;
}

export async function getTenantForHost(host: string): Promise<TenantInfo | null> {
  if (!host) return null;
  const cleanHostname = host
    .split(':')[0]
    .toLowerCase()
    .replace(/^www\./, '');
  const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  try {
    let property = (await db
      .prepare(
        `SELECT id, slug, name, city, country, branding, settings, plan, custom_domain, domain_verified
         FROM properties
         WHERE is_active = true
           AND (
             custom_domain = ?
             OR COALESCE(json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.customDomain'), '') = ?
           )
         LIMIT 1`
      )
      .get(cleanHostname, cleanHostname)) as any;

    if (!property && cleanHostname.endsWith(`.${BASE_DOMAIN}`)) {
      const sub = cleanHostname.slice(0, -(BASE_DOMAIN.length + 1));
      property = (await db
        .prepare(
          `SELECT id, slug, name, city, country, branding, settings, plan, custom_domain, domain_verified
           FROM properties
           WHERE is_active = true AND subdomain = ?
           LIMIT 1`
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
    console.error('[Tenant Resolution] Error:', err);
  }
  return null;
}
