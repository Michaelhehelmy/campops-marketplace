import { slotManager } from '@/lib/SlotManager';
import { logger } from '@/lib/logger';

// Import UI entry points from plugins
import { registerPlugin as registerBooking } from '../../plugins/booking/src/ui';
import { registerPlugin as registerCrm } from '../../plugins/crm/src/ui';
import { registerPlugin as registerLoyalty } from '../../plugins/loyalty/src/ui';
import { registerPlugin as registerPwa } from '../../plugins/pwa/src/ui';

let initPromise: Promise<void> | null = null;

/**
 * Initializes frontend plugins by registering their Single-SPA parcels
 * with the SlotManager. This is called by PluginShell on mount.
 * Concurrent callers await the same in-flight promise to avoid double-init.
 */
export async function initFrontendPlugins() {
  if (initPromise) return initPromise;

  if (typeof window !== 'undefined') {
    initPromise = (async () => {
      logger.info('Initializing frontend plugins (Single-SPA)...');

      // 1. Register Core/Fallback Components
      const { default: HeroSection } = await import('@/components/homepage/HeroSection');
      const { default: FeaturedListings } = await import('@/components/homepage/FeaturedListings');
      const { default: Categories } = await import('@/components/homepage/Categories');

      slotManager.register('homepage.hero', HeroSection);
      slotManager.register('homepage.featured-listings', FeaturedListings);
      slotManager.register('homepage.categories', Categories);

      // 2. Register Plugin UI Components
      try {
        registerBooking(slotManager);
        logger.info('Registered Booking UI parcels');
      } catch (e) {
        logger.error('Failed to register Booking UI:', e);
      }

      try {
        registerCrm(slotManager);
        logger.info('Registered CRM UI parcels');
      } catch (e) {
        logger.error('Failed to register CRM UI:', e);
      }

      try {
        registerLoyalty(slotManager);
        logger.info('Registered Loyalty UI parcels');
      } catch (e) {
        logger.error('Failed to register Loyalty UI:', e);
      }

      try {
        registerPwa(slotManager);
        logger.info('Registered PWA UI parcels');
      } catch (e) {
        logger.error('Failed to register PWA UI:', e);
      }

      logger.info('Frontend plugin initialization complete.');
      try {
        const { start } = await import('single-spa');
        start();
      } catch (e: any) {
        if (!e?.message?.includes('patchHistoryApi')) {
          logger.error('single-spa start() failed:', e);
        }
      }
    })();
    return initPromise;
  }
}
