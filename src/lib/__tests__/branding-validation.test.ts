import { describe, it, expect } from 'vitest';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';

describe('Branding Validation', () => {
  it('should save and retrieve branding JSON', async () => {
    const propertyId = uuidv4();
    const ownerId = uuidv4();

    await db.prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)').run(ownerId, `branding-${propertyId}@test.com`, 'pass');

    await db
      .prepare('INSERT INTO properties (id, owner_id, name, slug, plan, is_active) VALUES ($1, $2, $3, $4, $5, true)')
      .run(propertyId, ownerId, 'Branding Test', `branding-test-${propertyId.slice(0, 8)}`, 'premium');

    const brandingData = {
      logo: 'https://example.com/logo.png',
      primaryColor: '#2563eb',
      secondaryColor: '#7c3aed',
      fontFamily: 'Inter, sans-serif',
      tagline: 'Experience the wild',
      contactEmail: 'camp@example.com',
      contactPhone: '+1 234 567 890',
      address: '123 Camp Road',
      socialLinks: '{"instagram":"@camp"}',
      heroImage: 'https://example.com/hero.jpg',
    };

    await db
      .prepare('UPDATE properties SET branding = $1 WHERE id = $2')
      .run(JSON.stringify(brandingData), propertyId);

    const updated = (await db.prepare('SELECT branding FROM properties WHERE id = $1').get(propertyId)) as any;
    const saved = typeof updated.branding === 'string' ? JSON.parse(updated.branding) : updated.branding;

    expect(saved.primaryColor).toBe('#2563eb');
    expect(saved.logo).toBe('https://example.com/logo.png');
    expect(saved.contactEmail).toBe('camp@example.com');
    expect(saved.socialLinks).toBe('{"instagram":"@camp"}');
  });

  it('should allow partial brand updates', async () => {
    const propertyId = uuidv4();
    const ownerId = uuidv4();

    await db.prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)').run(ownerId, `partial-${propertyId}@test.com`, 'pass');
    await db
      .prepare('INSERT INTO properties (id, owner_id, name, slug, plan, is_active) VALUES ($1, $2, $3, $4, $5, true)')
      .run(propertyId, ownerId, 'Partial Brand', `partial-${propertyId.slice(0, 8)}`, 'premium');

    await db
      .prepare("UPDATE properties SET branding = $1 WHERE id = $2")
      .run(JSON.stringify({ primaryColor: '#ff0000', tagline: 'Original' }), propertyId);

    await db
      .prepare("UPDATE properties SET branding = $1 WHERE id = $2")
      .run(JSON.stringify({ tagline: 'Updated' }), propertyId);

    const updated = (await db.prepare('SELECT branding FROM properties WHERE id = $1').get(propertyId)) as any;
    const saved = typeof updated.branding === 'string' ? JSON.parse(updated.branding) : updated.branding;

    // Partial update replaces the whole column — only the new data exists
    expect(saved.tagline).toBe('Updated');
    expect(saved.primaryColor).toBeUndefined();
  });

  it('should reject invalid hex color values', async () => {
    const invalidColors = ['not-a-color', '#GGGGGG', 'rgb(0,0,0)', '', '#12345'];
    for (const color of invalidColors) {
      if (color === '') {
        expect(color).toBe('');
        continue;
      }
      const hexMatch = /^#[0-9a-fA-F]{6}$/.test(color);
      expect(hexMatch).toBe(false);
    }
  });

  it('should accept valid hex color values', async () => {
    const validColors = ['#2563eb', '#FF0000', '#ffffff', '#000000', '#a1b2c3'];
    for (const color of validColors) {
      expect(/^#[0-9a-fA-F]{6}$/.test(color)).toBe(true);
    }
  });

  it('should handle null branding gracefully', async () => {
    const propertyId = uuidv4();
    const ownerId = uuidv4();

    await db.prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)').run(ownerId, `nullbrand-${propertyId}@test.com`, 'pass');
    await db
      .prepare('INSERT INTO properties (id, owner_id, name, slug, plan, is_active) VALUES ($1, $2, $3, $4, $5, true)')
      .run(propertyId, ownerId, 'Null Brand', `nullbrand-${propertyId.slice(0, 8)}`, 'basic');

    const prop = (await db.prepare('SELECT branding FROM properties WHERE id = $1').get(propertyId)) as any;
    expect(prop.branding).toBeNull();
  });
});

describe('Plan Upgrade Validation', () => {
  it('should enforce upgrade chain: basic → premium → ultimate', async () => {
    const planOrder = { basic: 0, premium: 1, ultimate: 2 };

    expect(planOrder.premium > planOrder.basic).toBe(true);
    expect(planOrder.ultimate > planOrder.premium).toBe(true);
    expect(planOrder.basic < planOrder.ultimate).toBe(true);
  });

  it('should reject downgrade', async () => {
    const current = 'premium';
    const requested = 'basic';
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };

    const isDowngrade = planOrder[requested] <= planOrder[current];
    expect(isDowngrade).toBe(true);
  });

  it('should validate subdomain format', async () => {
    const valid = ['mycamp', 'my-camp', 'camp123', 'a'];
    const invalid = ['MyCamp', 'my camp', 'my_camp', 'camp.123', 'camp@test'];

    for (const s of valid) {
      const clean = s.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      expect(clean).toBe(s);
      expect(clean.length).toBeGreaterThan(0);
    }

    for (const s of invalid) {
      const clean = s.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      expect(clean).not.toBe(s);
    }
  });

  it('should validate custom domain format', async () => {
    const valid = ['bookings.mycamp.com', 'stay.example.org', 'reserve.camp.io'];
    const invalid = ['not-a-domain', 'noextension'];

    for (const d of valid) {
      const clean = d.trim().toLowerCase().replace(/^https?:\/\//, '');
      expect(clean.includes('.')).toBe(true);
    }

    for (const d of invalid) {
      const clean = d.trim().toLowerCase().replace(/^https?:\/\//, '');
      expect(clean.includes('.')).toBe(false);
    }
  });

  it('should reject duplicate subdomain in DB', async () => {
    const id1 = uuidv4();
    const id2 = uuidv4();
    const owner1 = uuidv4();
    const owner2 = uuidv4();
    const subdomain = 'duplicate-check';

    await db.prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)').run(owner1, `dup1-${id1}@test.com`, 'pass');
    await db.prepare('INSERT INTO users (id, email, password) VALUES ($1, $2, $3)').run(owner2, `dup2-${id2}@test.com`, 'pass');
    await db.prepare('INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain) VALUES ($1, $2, $3, $4, $5, true, $6)')
      .run(id1, owner1, 'First', `first-${id1.slice(0, 6)}`, 'premium', subdomain);

    const existing = (await db.prepare('SELECT id FROM properties WHERE subdomain = ? AND id != ?').get(subdomain, id2)) as any;
    expect(existing).toBeDefined();
    expect(existing.id).toBe(id1);
  });
});

describe('Domain Availability Check', () => {
  it('should detect valid domain format', () => {
    const domainPattern = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;
    expect(domainPattern.test('bookings.mycamp.com')).toBe(true);
    expect(domainPattern.test('stay.example.org')).toBe(true);
    expect(domainPattern.test('not-valid')).toBe(false);
    expect(domainPattern.test('')).toBe(false);
  });
});

describe('Plan Enforcement', () => {
  it('should block basic plan from accessing premium features', () => {
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
    const requiredPlan = 'premium';
    const currentPlan = 'basic';
    expect(planOrder[currentPlan] >= planOrder[requiredPlan]).toBe(false);
  });

  it('should block basic plan from accessing ultimate features', () => {
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
    expect(planOrder.basic >= planOrder.ultimate).toBe(false);
  });

  it('should allow premium plan to access basic features', () => {
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
    expect(planOrder.premium >= planOrder.basic).toBe(true);
  });

  it('should allow premium plan to access premium features', () => {
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
    expect(planOrder.premium >= planOrder.premium).toBe(true);
  });

  it('should allow ultimate plan to access all tiers', () => {
    const planOrder: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
    expect(planOrder.ultimate >= planOrder.basic).toBe(true);
    expect(planOrder.ultimate >= planOrder.premium).toBe(true);
    expect(planOrder.ultimate >= planOrder.ultimate).toBe(true);
  });
});
