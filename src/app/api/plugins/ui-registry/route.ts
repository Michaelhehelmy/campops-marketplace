import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { UIRegistryService } from '@/lib/UIRegistryService';
import { PluginRuntimeService } from '@/lib/PluginRuntimeService';

async function getPropertyIdFromSlug(slug: string): Promise<string | null> {
  const property = await db.queryOne('SELECT id FROM properties WHERE slug = ?', [slug]);
  return (property as any)?.id || null;
}

export async function GET(req: NextRequest) {
  try {
    await PluginRuntimeService.init();
    const { searchParams } = req.nextUrl;
    const propertyId = searchParams.get('propertyId');
    const slug = searchParams.get('slug');

    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    const userId = session?.user?.id || searchParams.get('userId');
    const role = session?.user?.role || searchParams.get('role');

    // Resolve property context
    let resolvedPropertyId: string | null = propertyId;

    // If propertyId looks like a slug, resolve it
    if (propertyId && isNaN(Number(propertyId))) {
      resolvedPropertyId = await getPropertyIdFromSlug(propertyId);
    } else if (!propertyId && slug) {
      resolvedPropertyId = await getPropertyIdFromSlug(slug);
    }

    // Validation
    const isMaster = role === 'master' || role === 'marketplace_master';
    const isGuestOrStaff = role === 'guest' || role === 'manager' || role === 'staff';

    if (!resolvedPropertyId && !isMaster && !isGuestOrStaff && userId) {
      return NextResponse.json(
        { error: 'propertyId or (userId + role=master) required' },
        { status: 400 }
      );
    }

    // Determine context
    const context = resolvedPropertyId || (!userId && !role) ? 'listing' : 'master';
    logger.info(
      `propertyId: ${resolvedPropertyId}, userId: ${userId}, role: ${role}, context: ${context}`
    );

    let enabledPlugins: any[] = [];

    if (context === 'listing') {
      // Fetch enabled plugins for this specific property
      if (resolvedPropertyId) {
        enabledPlugins = await db.query(
          `
          SELECT 
            pp.plugin_name,
            pp.config,
            pp.installed_version,
            ap.manifest,
            ap.display_name
          FROM property_plugins pp
          JOIN available_plugins ap ON ap.name = pp.plugin_name
          WHERE pp.property_id = ?
            AND pp.is_enabled  = 1
            AND ap.is_active   = 1
        `,
          [resolvedPropertyId]
        );
      } else {
        // Global context: fetch all official active plugins
        enabledPlugins = await db.query(
          `
          SELECT 
            name as plugin_name,
            '{}' as config,
            version as installed_version,
            manifest,
            display_name
          FROM available_plugins
          WHERE is_active = 1 AND is_official = 1
        `
        );
      }

      if (enabledPlugins.length === 0) {
        // If no plugins specifically enabled for this property, return empty for isolation
        enabledPlugins = [];
      }
    } else if (isMaster || role === 'guest' || role === 'manager' || role === 'staff') {
      logger.info('Fetching official plugins for guest/master context');
      enabledPlugins = await db.query(
        `
        SELECT 
          name as plugin_name,
          '{}' as config,
          version as installed_version,
          manifest,
          display_name
        FROM available_plugins
        WHERE is_active = 1 AND is_official = 1
      `
      );
    }
    logger.info(`Found ${enabledPlugins.length} enabled plugins`);

    // Accumulate registry data
    const slots: Record<string, string[]> = {};
    const menuItems: any[] = [];
    const dashboardWidgets: any[] = [];
    const settingsPages: any[] = [];
    const adminPages: any[] = [];

    for (const plugin of enabledPlugins) {
      const manifest =
        typeof plugin.manifest === 'string' ? JSON.parse(plugin.manifest) : (plugin.manifest ?? {});
      const pluginId: string = plugin.plugin_name;

      if (manifest.slots && typeof manifest.slots === 'object') {
        for (const [slotName, keys] of Object.entries(manifest.slots)) {
          // Basic filtering based on context
          if (context === 'master' && slotName.startsWith('dashboard.')) continue;
          if (context === 'listing' && slotName.startsWith('master.')) continue;

          if (Array.isArray(keys)) {
            if (!slots[slotName]) slots[slotName] = [];
            slots[slotName].push(
              ...(keys as string[]).map((k) => {
                return k.includes(':') ? k : `${pluginId}:${k}`;
              })
            );
          } else {
            if (!slots[slotName]) slots[slotName] = [];
          }
        }
      }

      if (Array.isArray(manifest.menuItems)) {
        menuItems.push(...manifest.menuItems.map((item: any) => ({ ...item, pluginId })));
      }
      if (Array.isArray(manifest.dashboardWidgets)) {
        dashboardWidgets.push(...manifest.dashboardWidgets.map((w: any) => ({ ...w, pluginId })));
      }
      if (Array.isArray(manifest.settingsPages)) {
        settingsPages.push(...manifest.settingsPages.map((p: any) => ({ ...p, pluginId })));
      }
      if (Array.isArray(manifest.adminPages)) {
        adminPages.push(...manifest.adminPages.map((p: any) => ({ ...p, pluginId })));
      }
    }

    // Merge database-persisted UI registrations from UIRegistryService
    const dbSlots = await UIRegistryService.getSlots(resolvedPropertyId || undefined);
    for (const s of dbSlots) {
      if (!s.componentId || !s.slotName) continue;
      if (!slots[s.slotName]) slots[s.slotName] = [];
      const key = s.componentId.includes(':') ? s.componentId : `${s.pluginId}:${s.componentId}`;
      if (!slots[s.slotName].includes(key)) {
        slots[s.slotName].push(key);
      }
    }

    const dbMenuItems = await UIRegistryService.getMenuItems(resolvedPropertyId || undefined);
    menuItems.push(...dbMenuItems);

    const dbWidgets = await UIRegistryService.getDashboardWidgets(resolvedPropertyId || undefined);
    dashboardWidgets.push(...dbWidgets);

    const dbSettings = await UIRegistryService.getSettingsPages(resolvedPropertyId || undefined);
    settingsPages.push(...dbSettings);

    return NextResponse.json({
      uiVersion: '1.0.0',
      context,
      slots: {
        'homepage.hero': ['homepage.hero'],
        'homepage.featured-listings': ['homepage.featured-listings'],
        'homepage.categories': ['homepage.categories'],
        ...slots,
      },
      menuItems,
      dashboardWidgets,
      settingsPages,
      adminPages,
    });
  } catch (err: any) {
    logger.error('Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
