import { NextRequest, NextResponse } from 'next/server';
import { db, getSqlite } from '@/lib/db';
import { logger } from '@/lib/logger';
import { ThemeRegistry } from '@/lib/ThemeRegistry';
import { buildCssVarsForTest as buildCssVars } from './cssVarsHelper';
import path from 'path';
import fs from 'fs';

interface TenantRow {
  id: string;
  slug: string;
  plan: string;
  subdomain?: string | null;
  custom_domain?: string | null;
  domain_verified?: number | boolean | null;
  settings?: string | null;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

function serveFile(
  buildsPath: string,
  rawPath: string,
  resolvedProperty: { id: string; settings?: string | null }
): NextResponse | null {
  const cleanPathname = rawPath.split('?')[0];
  let relativePath = cleanPathname;
  const localeMatch = cleanPathname.match(/^\/([a-z]{2})(?:\/|$)/);
  if (localeMatch) {
    relativePath = cleanPathname.replace(/^\/[a-z]{2}/, '') || '/';
  }
  if (relativePath === '/') {
    relativePath = '/index.html';
  }
  const filePath = path.join(buildsPath, relativePath);
  let resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(buildsPath)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const hasExtension = path.extname(cleanPathname) !== '';
  let fileExists = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
  if (!fileExists) {
    if (hasExtension) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    resolvedPath = path.resolve(path.join(buildsPath, 'index.html'));
    fileExists = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile();
    if (!fileExists) {
      return NextResponse.json({ error: 'index.html template not found' }, { status: 404 });
    }
  }
  const ext = path.extname(resolvedPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  if (ext === '.html') {
    let html = fs.readFileSync(resolvedPath, 'utf-8');
    html = html.replace(
      /<meta id="x-tenant-property-id" name="x-tenant-property-id" content=".*?" \/>|<meta id="x-tenant-property-id" name="x-tenant-property-id" content="" \/>/g,
      `<meta id="x-tenant-property-id" name="x-tenant-property-id" content="${resolvedProperty.id}" />`
    );
    const cssVars = buildCssVars(resolvedProperty);
    if (cssVars) {
      html = html.replace('<head>', `<head>\n<style id="tenant-vars">${cssVars}</style>`);
    }
    return new NextResponse(html, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
  const fileBuffer = fs.readFileSync(resolvedPath);
  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control':
        ext === '.js' || ext === '.css'
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=86400',
    },
  });
}

export async function GET(req: NextRequest) {
  // Headers set by middleware take priority (rewrite may not preserve query params)
  const url = new URL(req.url);
  const host = (
    req.headers.get('x-tenant-host') ||
    req.nextUrl.searchParams.get('host') ||
    url.searchParams.get('host')
  )
    ?.toLowerCase()
    .trim();
  const rawPath =
    req.headers.get('x-tenant-path') ||
    req.nextUrl.searchParams.get('path') ||
    url.searchParams.get('path') ||
    '/';
  const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com').toLowerCase();

  if (!host) {
    return NextResponse.json({ error: 'host query parameter is required' }, { status: 400 });
  }

  const hostname = host.split(':')[0];

  try {
    // 1. Resolve Tenant Domain
    // Local dev shortcut: 127.0.0.1 always resolves to Acacia Camp (ultimate tier demo)
    if (hostname === '127.0.0.1') {
      const localProperty = (await db
        .prepare(
          `SELECT id, slug, plan, custom_domain, domain_verified, settings FROM properties WHERE id = '3' AND is_active = true LIMIT 1`
        )
        .get()) as any;
      if (localProperty) {
        const tenantSlug = localProperty.slug;
        const localBuildsPath = path.join(process.cwd(), 'builds', tenantSlug, 'dist');
        if (fs.existsSync(localBuildsPath)) {
          return serveFile(localBuildsPath, rawPath, localProperty);
        }
      }
    }

    // Custom Domain Match
    let property = (await db
      .prepare(
        `
      SELECT id, slug, plan, custom_domain, domain_verified, settings
      FROM properties
      WHERE is_active = true
        AND (
          custom_domain = ?
          OR COALESCE(json_extract(CASE WHEN json_valid(settings) THEN settings ELSE '{}' END, '$.customDomain'), '') = ?
        )
      LIMIT 1
    `
      )
      .get(hostname, hostname)) as TenantRow | undefined;

    const parseSettings = (value: unknown) => {
      if (!value) return {};
      if (typeof value === 'string') {
        try {
          return JSON.parse(value || '{}');
        } catch {
          return {};
        }
      }
      return value as Record<string, unknown>;
    };

    if (property) {
      const settings = parseSettings(property.settings);
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
      const legacyVerified =
        property.custom_domain === hostname &&
        ![false, 0, '0'].includes(property.domain_verified ?? false);
      const jsonVerified = [true, 1, '1', 'true'].includes(settings.customDomainVerified as any);
      const verified = Boolean(legacyVerified || jsonVerified || isLocal);
      if (!verified) {
        return NextResponse.json({ error: 'Domain not yet verified' }, { status: 404 });
      }
    }

    // Subdomain Match
    let resolvedProperty = property;
    if (!resolvedProperty && hostname.endsWith(`.${BASE_DOMAIN}`)) {
      const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
      resolvedProperty = (await db
        .prepare(
          `
        SELECT id, slug, plan, subdomain, settings
        FROM properties
        WHERE is_active = true AND subdomain = ?
        LIMIT 1
      `
        )
        .get(sub)) as TenantRow | undefined;
    }

    if (!resolvedProperty) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const tenantSlug = resolvedProperty.slug;
    const buildsPath = path.join(process.cwd(), 'builds', tenantSlug, 'dist');

    if (!fs.existsSync(buildsPath)) {
      logger.info(
        `[Serve Route] No pre-built dist for ${tenantSlug} — checking ThemeLoader fallback`
      );
      try {
        const sqliteDb = getSqlite();
        const theme = ThemeRegistry.getForSite(sqliteDb, resolvedProperty.id);
        if (theme) {
          return NextResponse.json(
            {
              themeId: theme.id,
              themeName: theme.displayName,
              siteId: resolvedProperty.id,
              message: 'SSR theme active — serve via Next.js routes',
            },
            { status: 200 }
          );
        }
      } catch {
        // ignore — fall through to 404
      }
      logger.warn(`[Serve Route] Builds directory not found for ${tenantSlug} at ${buildsPath}`);
      return NextResponse.json({ error: 'Branded template build not found' }, { status: 404 });
    }

    return serveFile(buildsPath, rawPath, resolvedProperty);
  } catch (err: any) {
    logger.error('[Serve Route] Error serving custom domain asset:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
