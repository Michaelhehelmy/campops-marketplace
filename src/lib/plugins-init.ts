import { componentRegistry } from '@/components/plugins/ComponentRegistry';
import HeroSection from '@/components/homepage/HeroSection';
import FeaturedListings from '@/components/homepage/FeaturedListings';
import Categories from '@/components/homepage/Categories';
import { TestBanner } from '@/components/plugins/TestBanner';

// Mocked imports for plugins (since we don't have a real bundler in this turn)
import {
  PublicBookingWidget,
  ManagerBookingsList,
  StaffCheckInPanel,
  GuestReservationsList,
} from '../../plugins/booking/src/ui';
import { ActivityWidget } from '../../plugins/crm/src/ui';

/**
 * Global plugin initialization
 * ───────────────────────────
 * This function is called on the frontend to bootstrap plugin UI components.
 */
export async function initPlugins() {
  if (typeof window !== 'undefined') {
    console.info('[Plugin System] Initializing frontend plugins...');

    // 1. Register core homepage components
    componentRegistry.register('homepage.hero', HeroSection);
    componentRegistry.register('homepage.featured-listings', FeaturedListings);
    componentRegistry.register('homepage.categories', Categories);

    // 2. Register test/plugin components
    componentRegistry.register('pwa:PWAInstallBanner', TestBanner);

    // Register plugin components directly for now (mocks real loading)
    componentRegistry.register('booking:PublicBookingWidget', PublicBookingWidget);
    componentRegistry.register('booking:ManagerBookingsList', ManagerBookingsList);
    componentRegistry.register('booking:StaffCheckInPanel', StaffCheckInPanel);
    componentRegistry.register('booking:GuestReservationsList', GuestReservationsList);
    componentRegistry.register('crm:ActivityWidget', ActivityWidget);

    console.info(
      '[Plugin System] Registered components:',
      Array.from(componentRegistry.getAll().keys())
    );
  }
}

export async function loadPluginBundle(pluginId: string, bundleUrl: string) {
  // In a real app, this would inject a script.
  // For now, we already registered them in initPlugins.
  return Promise.resolve();
}
