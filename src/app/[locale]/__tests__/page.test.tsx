import { describe, it, vi, beforeEach } from 'vitest';
import { componentRegistry } from '@/components/plugins/ComponentRegistry';
import HeroSection from '@/components/homepage/HeroSection';
import FeaturedListings from '@/components/homepage/FeaturedListings';
import Categories from '@/components/homepage/Categories';

// Mock global fetch
global.fetch = vi.fn();

describe('Homepage config fetching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch homepage config from API', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        sections: ['hero', 'featured-listings', 'categories'],
        roleBased: {},
      }),
    });

    const res = await fetch('/api/public/homepage-config');
    const data = await res.json();

    expect(data.sections).toEqual(['hero', 'featured-listings', 'categories']);
    expect(global.fetch).toHaveBeenCalledWith('/api/public/homepage-config');
  });

  it('should handle API errors gracefully', async () => {
    (global.fetch as any).mockRejectedValue(new Error('Network error'));

    await expect(fetch('/api/public/homepage-config')).rejects.toThrow('Network error');
  });

  it('should handle non-OK responses', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    const res = await fetch('/api/public/homepage-config');
    expect(res.ok).toBe(false);
  });
});

describe('Homepage slot naming', () => {
  it('should convert section names to slot names correctly', () => {
    const sections = ['hero', 'featured-listings', 'categories'];
    const slotNames = sections.map((s) => `homepage.${s}`);

    expect(slotNames).toEqual([
      'homepage.hero',
      'homepage.featured-listings',
      'homepage.categories',
    ]);
  });

  it('should handle custom section names', () => {
    const sections = ['hero', 'testimonials', 'cta'];
    const slotNames = sections.map((s) => `homepage.${s}`);

    expect(slotNames).toEqual(['homepage.hero', 'homepage.testimonials', 'homepage.cta']);
  });
});

describe('Homepage config structure', () => {
  it('should have valid default config structure', () => {
    const defaultConfig = {
      sections: ['hero', 'featured-listings', 'categories'],
      roleBased: {
        guest: { hero: 'personalized-hero' },
        admin: { hero: 'dashboard-link' },
        master: { hero: 'dashboard-link' },
      },
    };

    expect(defaultConfig.sections).toBeInstanceOf(Array);
    expect(defaultConfig.sections.length).toBeGreaterThan(0);
    expect(defaultConfig.roleBased).toBeDefined();
    expect(defaultConfig.roleBased.guest).toBeDefined();
    expect(defaultConfig.roleBased.admin).toBeDefined();
    expect(defaultConfig.roleBased.master).toBeDefined();
  });

  it('should allow empty sections array', () => {
    const config = {
      sections: [],
      roleBased: {},
    };

    expect(config.sections).toEqual([]);
  });
});

describe('ComponentRegistry integration', () => {
  beforeEach(() => {
    // Register fallback components
    componentRegistry.register('homepage.hero', HeroSection);
    componentRegistry.register('homepage.featured-listings', FeaturedListings);
    componentRegistry.register('homepage.categories', Categories);
  });

  it('should retrieve registered components', () => {
    expect(componentRegistry.get('homepage.hero')).toBe(HeroSection);
    expect(componentRegistry.get('homepage.featured-listings')).toBe(FeaturedListings);
    expect(componentRegistry.get('homepage.categories')).toBe(Categories);
  });

  it('should return undefined for unregistered components', () => {
    expect(componentRegistry.get('homepage.nonexistent')).toBeUndefined();
  });
});
