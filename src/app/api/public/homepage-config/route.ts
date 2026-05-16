import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/public/homepage-config
 *
 * Returns the ordered list of sections to display on the homepage.
 * This configuration is stored in the database and can be modified by the master admin.
 *
 * Response:
 * {
 *   "sections": ["hero", "featured-listings", "categories", "testimonials", "cta"],
 *   "roleBased": {
 *     "guest": { "hero": "personalized-hero" },
 *     "admin": { "hero": "dashboard-link" }
 *   }
 * }
 */

export async function GET(req: NextRequest) {
  try {
    // Fetch homepage configuration from database
    const prep = db.prepare("SELECT config FROM homepage_config WHERE id = 'main'");
    let config = prep.get();
    if (config instanceof Promise) config = await config;

    if (!config) {
      // Return default configuration if none exists
      return NextResponse.json({
        sections: ['hero', 'featured-listings', 'categories'],
        roleBased: {
          guest: { hero: 'personalized-hero' },
          admin: { hero: 'dashboard-link' },
          master: { hero: 'dashboard-link' },
        },
      });
    }

    // Support both stringified JSON and pre-parsed objects (for tests)
    const data = typeof config.config === 'string' ? JSON.parse(config.config) : config.config;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[Homepage Config API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { sections, roleBased } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json({ error: 'sections must be an array' }, { status: 400 });
    }

    // Check if configuration exists
    const prep = db.prepare("SELECT id FROM homepage_config WHERE id = 'main'");
    let existing = prep.get();
    if (existing instanceof Promise) existing = await existing;

    const configStr = JSON.stringify({ sections, roleBased: roleBased || {} });

    if (existing) {
      await db.prepare("UPDATE homepage_config SET config = ? WHERE id = 'main'").run(configStr);
    } else {
      await db
        .prepare("INSERT INTO homepage_config (id, config) VALUES ('main', ?)")
        .run(configStr);
    }

    const response: any = { ok: true, sections };
    if (roleBased) response.roleBased = roleBased;

    return NextResponse.json(response);
  } catch (err: any) {
    console.error('[Homepage Config API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
