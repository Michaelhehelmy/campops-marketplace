import { beforeEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { GET, PUT } from '../route';
import { v4 as uuidv4 } from 'uuid';

describe('Branding API Route', () => {
  beforeEach(async () => {
    await db.prepare("DELETE FROM properties WHERE slug LIKE 'branding-route-%'").run();
    await db.prepare("DELETE FROM users WHERE email LIKE 'branding-route-%@test.com'").run();
  });

  it('returns branding fields for the active listing', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `branding-route-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, 'branding-route-owner@test.com', 'password');

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
        'Branding Route Shop',
        slug,
        JSON.stringify({
          branding: {
            logo: { url: 'https://cdn.example.com/logo.png' },
            colors: { primary: '#123456', secondary: '#abcdef', accent: '#ff00ff' },
            labels: { welcomeMessage: 'Welcome to Branding Route Shop' },
          },
        })
      );

    const req = new NextRequest(`http://localhost/api/branding?slug=${slug}`);
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.branding.logo.url).toBe('https://cdn.example.com/logo.png');
    expect(data.branding.colors.primary).toBe('#123456');
    expect(data.branding.labels.welcomeMessage).toBe('Welcome to Branding Route Shop');
  });

  it('updates branding and deep-merges nested fields', async () => {
    const ownerId = uuidv4();
    const listingId = uuidv4();
    const slug = `branding-route-${Date.now()}`;

    await db
      .prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)')
      .run(ownerId, 'branding-route-owner-2@test.com', 'password');

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
        'Branding Route Shop',
        slug,
        JSON.stringify({
          branding: {
            colors: { primary: '#000000', secondary: '#abcdef' },
          },
        })
      );

    const req = new NextRequest('http://localhost/api/branding', {
      method: 'PUT',
      body: JSON.stringify({
        slug,
        userId: ownerId,
        branding: {
          logo: { url: 'https://cdn.example.com/new-logo.png' },
        },
      }),
    });

    const res = await PUT(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);

    const fetchReq = new NextRequest(`http://localhost/api/branding?slug=${slug}`);
    const fetchRes = await GET(fetchReq);
    const fetchData = await fetchRes.json();

    expect(fetchRes.status).toBe(200);
    expect(fetchData.branding.colors.primary).toBe('#000000');
    expect(fetchData.branding.colors.secondary).toBe('#abcdef');
    expect(fetchData.branding.logo.url).toBe('https://cdn.example.com/new-logo.png');
  });
});
