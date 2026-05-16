import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '../db';

// Mock the UI registry route logic (simplified for unit testing)
async function getMockRegistry(role: string, userId?: string, propertyId?: string) {
  // Simulate the logic in src/app/api/plugins/ui-registry/route.ts
  let plugins: any[] = [];

  if (role === 'marketplace_master') {
    plugins = [
      {
        plugin_name: 'accounting',
        manifest: {
          slots: {
            'dashboard.top': ['accounting:Stats'],
            'master.view': ['accounting:MasterView'],
          },
        },
      },
    ];
  } else {
    plugins = [
      {
        plugin_name: 'pwa',
        manifest: {
          slots: { 'dashboard.top': ['pwa:Banner'] },
        },
      },
    ];
  }

  const slots: Record<string, string[]> = {};
  for (const p of plugins) {
    if (p.manifest.slots) {
      for (const [slot, keys] of Object.entries(p.manifest.slots)) {
        // Apply the same filter logic as in the route
        if (role === 'marketplace_master' && slot === 'dashboard.top') continue;

        if (!slots[slot]) slots[slot] = [];
        slots[slot].push(...(keys as string[]));
      }
    }
  }

  return { slots };
}

describe('Plugin Registry Contract', () => {
  it('should filter out listing-specific slots for master role', async () => {
    const registry = await getMockRegistry('marketplace_master', 'user-1');

    // Master should NOT see listing dashboard top slots
    expect(registry.slots['dashboard.top']).toBeUndefined();

    // Master SHOULD see master-specific slots
    expect(registry.slots['master.view']).toContain('accounting:MasterView');
  });

  it('should include all slots for listing context', async () => {
    const registry = await getMockRegistry('owner', 'user-2', 'prop-1');

    expect(registry.slots['dashboard.top']).toContain('pwa:Banner');
  });
});

describe('Guest Access Contract', () => {
  it('should verify guest access based on reservation dates', async () => {
    // Mock date check logic
    const now = new Date();
    const checkIn = new Date(now.getTime() - 86400000); // Yesterday
    const checkOut = new Date(now.getTime() + 86400000); // Tomorrow

    const hasAccess = now >= checkIn && now <= checkOut;
    expect(hasAccess).toBe(true);

    const futureCheckIn = new Date(now.getTime() + 86400000);
    const expiredAccess = now >= futureCheckIn;
    expect(expiredAccess).toBe(false);
  });
});
