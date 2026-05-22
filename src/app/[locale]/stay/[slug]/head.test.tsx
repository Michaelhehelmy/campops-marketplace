import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { db } from '@/lib/db';
import Head from './head';
import { v4 as uuidv4 } from 'uuid';

describe('tenant head branding', () => {
  beforeEach(async () => {
    await db.prepare("DELETE FROM properties WHERE slug LIKE 'head-branding-%'").run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'head-branding-%@test.com'").run();
  });

  it('injects listing CSS variables and theme color into the head', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `head-branding-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, 'head-branding-owner@test.com', 'password');

    await db
      .prepare(
        `
      INSERT INTO properties (id, owner_id, name, slug, plan, is_active, settings)
      VALUES ($1, $2, $3, $4, 'basic', true, $5)
    `
      )
      .run(
        listingId,
        ownerId,
        'Head Branding Shop',
        slug,
        JSON.stringify({
          branding: {
            colors: { primary: '#112233', secondary: '#445566', accent: '#778899' },
          },
        })
      );

    const element = await Head({ params: { slug } });
    const html = renderToStaticMarkup(<>{element}</>);

    expect(html).toContain('--tenant-primary:#112233');
    expect(html).toContain('--tenant-secondary:#445566');
    expect(html).toContain('meta name="theme-color" content="#112233"');
  });
});
