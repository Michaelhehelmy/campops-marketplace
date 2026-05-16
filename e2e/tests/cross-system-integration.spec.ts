import { test, expect } from '../helpers/auth.fixture';

test.describe('Cross-System Integration Flow', () => {
  test('Full journey: Master config -> Public booking -> Guest verify -> Manager update -> Staff check-in -> Finance/Commission check', async ({
    masterSession,
    managerSession,
    staffSession,
    guestSession,
    browser,
  }) => {
    test.setTimeout(300000); // Increase timeout to 300s

    // Helper to create an authenticated page
    const createAuthPage = async (session: { storageState: string }) => {
      const state = JSON.parse(session.storageState);
      const context = await browser.newContext();
      await context.addCookies(state.cookies);
      return { context, page: await context.newPage() };
    };

    const master = await createAuthPage(masterSession);
    const manager = await createAuthPage(managerSession);
    const staff = await createAuthPage(staffSession);
    const guest = await createAuthPage(guestSession);

    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      console.log('0. Resetting database...');
      await publicPage.request.post('http://localhost:3000/api/test/reset');

      console.log('1. Master enabling plugins...');
      await master.page.goto('/en/admin/listings/1');
      await master.page.getByRole('tab', { name: /Plugins/i }).click();

      // Wait for plugins to load
      await master.page.waitForSelector('text=Listing Plugins');
      await master.page.waitForTimeout(1000); // Give time for plugins to render

      // Find all plugin checkboxes - they have aria-label with plugin name
      const bookingPlugin = master.page.getByRole('checkbox', { name: /booking/i });
      await expect(bookingPlugin).toBeVisible({ timeout: 5000 });
      if (!(await bookingPlugin.isChecked())) {
        await bookingPlugin.click();
        await master.page.waitForResponse(
          (res) => res.url().includes('/plugins') && res.status() === 200
        );
      }

      // Find CRM plugin toggle
      const crmPlugin = master.page.getByRole('checkbox', { name: 'crm', exact: true });
      await expect(crmPlugin).toBeVisible({ timeout: 5000 });
      if (!(await crmPlugin.isChecked())) {
        await crmPlugin.click();
        await master.page.waitForResponse(
          (res) => res.url().includes('/plugins') && res.status() === 200
        );
      }

      console.log('2. Public user booking...');
      await publicPage.goto('/en/stay/safari-camp?checkIn=2025-01-01&checkOut=2025-01-02');
      // Wait for core booking link to appear
      await expect(publicPage.getByRole('link', { name: /Book now/i }).first()).toBeVisible({
        timeout: 15000,
      });

      await publicPage
        .getByRole('link', { name: /Book now/i })
        .first()
        .click();

      console.log('2.1 Filling booking form...');
      await publicPage.getByPlaceholder('Jane Smith').fill('Integration Guest');
      await publicPage.getByPlaceholder('jane@example.com').fill('guest@campops.com');

      console.log('2.2 Continuing to payment...');
      await publicPage.getByRole('button', { name: /Continue to payment/i }).click();

      console.log('2.3 Confirming booking...');
      await publicPage.getByRole('button', { name: /Confirm Booking|Proceed to payment/i }).click();

      // Wait for success state
      console.log('2.4 Waiting for success state...');
      await expect(publicPage.getByText(/Booking Confirmed/i)).toBeVisible({ timeout: 15000 });

      console.log('3. Guest verifying reservation...');
      // 3. Guest verifies reservation

      await guest.page.goto('/en/guest');
      await expect(guest.page.getByText(/Safari Camp/i).first()).toBeVisible({ timeout: 15000 });

      console.log('4. Manager modifying booking...');
      // 4. Manager sees and modifies booking

      await manager.page.goto('/en/manage/safari-camp/bookings');
      console.log('4.1 Waiting for booking row...');
      const bookingRow = manager.page.locator('tr', { hasText: 'Integration Guest' });
      await expect(bookingRow.first()).toBeVisible({ timeout: 15000 });

      console.log('4.2 Clicking Manage...');
      await bookingRow
        .first()
        .getByRole('button', { name: /Manage/i })
        .click();

      console.log('4.3 Filling notes and saving...');
      await manager.page.getByLabel(/Notes/i).fill('Upgraded to premium tent');
      await manager.page.getByRole('button', { name: /Save Changes/i }).click();
      console.log('4.4 Manager modification saved.');

      console.log('5. Staff checking in guest...');
      // 5. Staff checks in guest

      await staff.page.goto('/en/manage/safari-camp/bookings');
      console.log('5.1 Waiting for staff booking row...');
      const staffBookingRow = staff.page.locator('tr', { hasText: 'Integration Guest' }).first();
      await expect(staffBookingRow).toBeVisible({ timeout: 10000 });

      console.log('5.2 Clicking Check-in...');
      await staff.page
        .getByTestId(/check-in-/)
        .first()
        .click();

      console.log('5.3 Verifying checked-in status...');
      await expect(staffBookingRow.getByText(/checked-in/i)).toBeVisible({ timeout: 10000 });
      console.log('5.4 Guest checked in.');

      console.log('6. Manager viewing Finance...');
      await manager.page.goto('/en/manage/safari-camp/finance');
      // Wait for data load
      console.log('6.1 Waiting for finance data...');
      await manager.page.waitForLoadState('networkidle');
      await expect(manager.page.getByText(/Commission/i).first()).toBeVisible({ timeout: 15000 });
      console.log('6.2 Finance data verified.');

      console.log('7. Master viewing platform commissions...');
      await master.page.goto('/en/admin/reports/commissions');
      console.log('7.1 Waiting for commission reports...');
      await master.page.waitForLoadState('networkidle');
      await expect(master.page.getByText(/Safari Camp/i).first()).toBeVisible({ timeout: 15000 });
      console.log('7.2 Platform commissions verified.');

      console.log('8. Master disabling Booking plugin...');
      // 8. Master disables Booking plugin -> Listing widget disappears

      await master.page.goto('/en/admin/listings/1');
      await master.page.getByRole('tab', { name: /Plugins/i }).click();
      console.log('8.1 Toggling booking plugin...');
      const bookingPluginCheck = master.page.getByRole('checkbox', { name: /booking/i });
      await bookingPluginCheck.click();

      console.log('8.2 Verifying widget disappeared...');
      await publicPage.goto('/en/stay/safari-camp');
      await expect(publicPage.getByRole('button', { name: /Reserve Now/i })).not.toBeVisible({
        timeout: 10000,
      });
      console.log('8.3 Widget disappeared.');
    } finally {
      await master.context.close();
      await manager.context.close();
      await staff.context.close();
      await guest.context.close();
      await publicContext.close();
    }
  });
});
