/**
 * Booking route tests have been moved to plugin route registry.
 * Handlers are now inline in plugins/booking/src/api/routes.ts
 * and tested via integration tests (see plugin-integration.test.ts).
 */
import { describe, it } from 'vitest';

describe('Bookings route tests (moved to plugin)', () => {
  it.skip('handlers moved to plugins/booking/src/api/routes.ts', () => {});
});
