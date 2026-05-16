import { describe, it, expect } from 'vitest';
import {
  ListingSearchSchema,
  CreateListingSchema,
  MasterUpdateListingSchema,
  AdminUpdateListingSchema,
} from '../src/schemas.js';

// ── ListingSearchSchema ───────────────────────────────────────────────────────

describe('ListingSearchSchema', () => {
  it('accepts valid search params', () => {
    const result = ListingSearchSchema.safeParse({
      search: 'camp',
      location: 'Kenya',
      tier: 'premium',
      page: '2',
      limit: '10',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it('applies defaults for page and limit', () => {
    const result = ListingSearchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects invalid tier', () => {
    const result = ListingSearchSchema.safeParse({ tier: 'ultra' });
    expect(result.success).toBe(false);
  });

  it('rejects page < 1', () => {
    const result = ListingSearchSchema.safeParse({ page: '0' });
    expect(result.success).toBe(false);
  });

  it('rejects limit > 100', () => {
    const result = ListingSearchSchema.safeParse({ limit: '200' });
    expect(result.success).toBe(false);
  });
});

// ── CreateListingSchema ───────────────────────────────────────────────────────

describe('CreateListingSchema', () => {
  const valid = {
    tenant_id: 'tenant-1',
    title: 'Safari Camp',
    slug: 'safari-camp',
  };

  it('accepts valid minimal body', () => {
    const result = CreateListingSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('applies defaults for tier, is_active, is_featured', () => {
    const result = CreateListingSchema.safeParse(valid);
    if (result.success) {
      expect(result.data.tier).toBe('basic');
      expect(result.data.is_active).toBe(true);
      expect(result.data.is_featured).toBe(false);
    }
  });

  it('rejects missing tenant_id', () => {
    const result = CreateListingSchema.safeParse({ title: 'T', slug: 'slug' });
    expect(result.success).toBe(false);
  });

  it('rejects missing title', () => {
    const result = CreateListingSchema.safeParse({ tenant_id: 'x', slug: 'slug' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug with uppercase', () => {
    const result = CreateListingSchema.safeParse({ ...valid, slug: 'UPPERCASE' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug with spaces', () => {
    const result = CreateListingSchema.safeParse({ ...valid, slug: 'has space' });
    expect(result.success).toBe(false);
  });

  it('accepts hyphenated slugs', () => {
    const result = CreateListingSchema.safeParse({ ...valid, slug: 'my-great-listing-123' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid image URL', () => {
    const result = CreateListingSchema.safeParse({ ...valid, images: ['not-a-url'] });
    expect(result.success).toBe(false);
  });

  it('accepts valid image URLs', () => {
    const result = CreateListingSchema.safeParse({
      ...valid,
      images: ['https://example.com/img.jpg'],
    });
    expect(result.success).toBe(true);
  });
});

// ── MasterUpdateListingSchema ─────────────────────────────────────────────────

describe('MasterUpdateListingSchema', () => {
  it('accepts empty object (no required fields)', () => {
    const result = MasterUpdateListingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts partial updates', () => {
    const result = MasterUpdateListingSchema.safeParse({ title: 'New Title', tier: 'elite' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid tier', () => {
    const result = MasterUpdateListingSchema.safeParse({ tier: 'gold' });
    expect(result.success).toBe(false);
  });
});

// ── AdminUpdateListingSchema ──────────────────────────────────────────────────

describe('AdminUpdateListingSchema', () => {
  it('accepts empty object', () => {
    const result = AdminUpdateListingSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts allowed fields', () => {
    const result = AdminUpdateListingSchema.safeParse({
      title: 'Updated',
      description: 'New desc',
      is_active: false,
    });
    expect(result.success).toBe(true);
  });

  it('does NOT contain slug, tenant_id, or is_featured fields', () => {
    // Zod strips unknown keys by default; verify these pass through as undefined
    const result = AdminUpdateListingSchema.safeParse({
      slug: 'new-slug',
      tenant_id: 'other-tenant',
      is_featured: true,
      title: 'Title',
    });
    // In Zod, unknown keys are stripped — success but slug/tenant/featured are absent
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).slug).toBeUndefined();
      expect((result.data as any).tenant_id).toBeUndefined();
    }
  });
});
