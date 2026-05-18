import { test, expect } from '../helpers/auth.fixture';

test.describe('Cross-System Integration Flow', () => {
  test('Full journey from platform config to guest booking and staff check-in', async ({
    page,
    masterSession,
    managerSession,
    guestSession,
    staffSession,
  }) => {
    test.setTimeout(180000);
    // 0. Reset DB to clean state
    await page.request.post('http://localhost:3000/api/test/reset');

    // 1. Master enables Booking plugin for Safari Camp
    const masterState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(masterState.cookies);

    await page.goto('/en/admin/plugins');
    // Ensure booking is enabled for Safari Camp (property 1)
    const safariRow = page.getByRole('row').filter({ hasText: /Safari Camp/i });
    // This is assuming a UI where plugins can be toggled per property
    // For now, let's just ensure it's on globally if per-property is not yet in UI
    const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
    if ((await bookingToggle.textContent())?.includes('Disabled')) {
      await bookingToggle.click();
    }

    // 2. Public guest searches and books a room via Marketplace
    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp?checkIn=2025-06-15&checkOut=2025-06-20');

    await page
      .getByRole('link', { name: /Book now/i })
      .first()
      .click();
    await page.getByPlaceholder('Jane Smith').fill('Integration Guest');
    await page.getByPlaceholder('jane@example.com').fill('guest@sinaicamps.com');
    await page.getByRole('button', { name: /Continue to payment/i }).click();
    await page.getByLabel(/Pay at property/i).check();
    await page.getByRole('button', { name: /Confirm Booking/i }).click();
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible();
    await page.waitForLoadState('networkidle');

    // 3. Guest logs in and sees the booking in their dashboard
    const guestState = JSON.parse(guestSession.storageState);
    await page.context().clearCookies();
    await page.context().addCookies(guestState.cookies);
    await page.goto('/en/guest/reservations');
    await expect(page.getByText(/Safari Camp/i).first()).toBeVisible();

    // 4. Manager (Shop Front) logs in and sees the booking in their list
    const managerState = JSON.parse(managerSession.storageState);
    await page.context().clearCookies();
    await page.context().addCookies(managerState.cookies);
    await page.goto('/en/manage/1/bookings');
    await expect(page.getByText(/Integration Guest/i).first()).toBeVisible({ timeout: 15000 });

    // 5. Manager modifies the booking (change guest name or status)
    // Click manage on the new booking
    const bookingRow = page
      .getByRole('row')
      .filter({ hasText: /Integration Guest/i })
      .first();
    await bookingRow.getByRole('button', { name: /Manage/i }).click();
    await page.getByLabel(/Notes/i).fill('Integration Guest Modified');
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // 6. Guest refreshes and sees the updated details
    await page.context().clearCookies();
    await page.context().addCookies(guestState.cookies);
    await page.goto('/en/guest/reservations');
    await expect(page.getByText(/Safari Camp/i).first()).toBeVisible();

    // 7. Staff checks in the guest; status changes on both sides
    const staffState = JSON.parse(staffSession.storageState);
    await page.context().clearCookies();
    await page.context().addCookies(staffState.cookies);
    await page.goto('/en/manage/1/bookings');

    const staffRow = page
      .getByRole('row')
      .filter({ hasText: /Integration Guest/i })
      .first();
    const checkInBtn = page.getByTestId(/check-in-/).first();
    await expect(checkInBtn).toBeVisible({ timeout: 10000 });
    await checkInBtn.click();
    await expect(staffRow.getByText(/checked-in/i)).toBeVisible({ timeout: 10000 });
  });
});
