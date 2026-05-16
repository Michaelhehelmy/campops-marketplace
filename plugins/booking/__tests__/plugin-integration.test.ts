import { describe, it, expect, beforeEach } from 'vitest';
import { makePluginAPI } from '../PluginAPI';
import { hookManager } from '../hooks';
import bookingInit from '../../../plugins/booking/src/index';
import crmInit from '../../../plugins/crm/src/index';
import { db } from '../db';

describe('Plugin Inter-communication Integration', () => {
  beforeEach(async () => {
    hookManager.clear();
    // In a real test we might want to clear tables, but for this mock-based env it's fine
  });

  it('triggers CRM activity logging when a booking is created', async () => {
    const propertyId = 'prop-123';

    // 1. Initialize Booking Plugin
    const bookingApi = makePluginAPI('booking', propertyId);
    const bookingService = await bookingInit(bookingApi);

    // 2. Initialize CRM Plugin
    const crmApi = makePluginAPI('crm', propertyId);
    const crmService = await crmInit(crmApi);

    // 3. Create a booking via Booking Plugin
    await (bookingService as any).createBooking({
      guestName: 'Samantha Reed',
      checkIn: '2025-08-01',
      checkOut: '2025-08-05',
      totalPrice: 1500,
    });

    // 4. Verify that CRM logged the activity
    // We query the CRM table directly via the CRM service
    const activities = await (crmService as any).getActivities('Samantha Reed');

    expect(activities).toHaveLength(1);
    expect(activities[0].activity_type).toBe('BOOKING_CREATED');
    expect(activities[0].details).toContain('$1500');
  });

  it('Booking plugin works standalone even if CRM is not initialized', async () => {
    const propertyId = 'prop-123';
    const bookingApi = makePluginAPI('booking', propertyId);
    const bookingService = await bookingInit(bookingApi);

    // This should not throw even though no one is listening to the hook
    const res = await (bookingService as any).createBooking({
      guestName: 'Standalone Guest',
      checkIn: '2025-09-01',
      checkOut: '2025-09-05',
      totalPrice: 300,
    });

    expect(res.guest_name).toBe('Standalone Guest');
  });
});
