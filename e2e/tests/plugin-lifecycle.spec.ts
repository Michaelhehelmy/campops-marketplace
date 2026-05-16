import { test, expect } from '../helpers/auth.fixture';

/**
 * Plugin Lifecycle E2E Tests
 * ─────────────────────────
 * Verifies the full flow from master toggle to guest-visible UI and inter-plugin hooks.
 */
test.describe('Plugin Lifecycle', () => {
  test('Scenario 1 & 2: Master toggles Booking plugin and guest sees it', async ({
    page,
    masterSession,
  }) => {
    // TODO: Fix plugin component registration issue - booking widget not rendering
    const storageState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(storageState.cookies);

    // 1. Master enables Booking for Safari Camp
    await page.goto('/en/admin/plugins');

    // Select Safari Camp
    const propertySelect = page.getByRole('combobox');
    await propertySelect.selectOption({ label: 'Safari Camp (safari-camp)' });

    const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
    await expect(bookingToggle).toBeVisible();

    // Ensure it's enabled
    if ((await bookingToggle.textContent())?.includes('Enable')) {
      await bookingToggle.click();
    }

    // Verify it changed to "Enabled"
    await expect(
      page.getByRole('button', { name: /Disable Marketplace Booking plugin/i })
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Disable Marketplace Booking/i })).toBeVisible();

    // 2. Visit listing as guest and verify banner
    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp');

    const bookingWidget = page.getByRole('region', { name: /Book Your Stay/i });
    await expect(bookingWidget).toBeVisible();
    await expect(bookingWidget.getByRole('heading', { name: /Book Your Stay/i })).toBeVisible();

    // 3. Disable as master and verify it's gone
    await page.context().addCookies(storageState.cookies);
    await page.goto('/en/admin/plugins');
    // Ensure property is selected
    await page.getByRole('combobox').selectOption({ label: 'Safari Camp (safari-camp)' });

    const disableButton = page.getByRole('button', { name: /Disable Marketplace Booking plugin/i });
    await disableButton.click();
    await expect(
      page.getByRole('button', { name: /Enable Marketplace Booking plugin/i })
    ).toBeVisible();

    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp');
    await expect(page.getByRole('region', { name: /Book Your Stay/i })).not.toBeVisible();

    // 4. Re-enable for other tests
    await page.context().addCookies(storageState.cookies);
    await page.goto('/en/admin/plugins');
    await page.getByRole('button', { name: /Enable.*Marketplace Booking plugin/i }).click();
    await expect(
      page.getByRole('button', { name: /Disable Marketplace Booking plugin/i })
    ).toBeVisible();
  });

  test('Scenario 3: Standalone Booking functionality (Guest book -> Manager see)', async ({
    page,
    masterSession,
    managerSession,
    guestSession,
  }) => {
    // TODO: Fix plugin component registration issue - booking widget not rendering
    // 1. Ensure Booking is enabled for Safari Camp
    const masterState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(masterState.cookies);
    await page.goto('/en/admin/plugins');
    await page.getByRole('combobox').selectOption('1');

    const toggle = page.getByRole('button', { name: /Marketplace Booking plugin/i });
    if ((await toggle.textContent())?.includes('Enable')) {
      await toggle.click();
      await expect(
        page.getByRole('button', { name: /Disable Marketplace Booking/i })
      ).toBeVisible();
    }

    // 2. Book as guest
    const guestState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(guestState.cookies);
    await page.goto('/en/stay/safari-camp');

    await page.getByRole('button', { name: /Reserve Now/i }).click();
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible();

    // 3. Check as manager in admin
    const managerState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(managerState.cookies);
    await page.goto('/en/manage/safari-camp/settings?tab=booking-admin');

    await expect(page.getByRole('heading', { name: /Booking Management/i })).toBeVisible();
    await expect(page.getByText('Alice Smith')).toBeVisible();
  });

  test('Scenario 4: Inter-plugin communication (Booking + CRM)', async ({
    page,
    masterSession,
    managerSession,
    guestSession,
  }) => {
    const masterState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(masterState.cookies);
    await page.goto('/en/admin/plugins');
    await page.getByRole('combobox').selectOption('1');

    // Enable both
    const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
    if ((await bookingToggle.textContent())?.includes('Enable')) await bookingToggle.click();

    const crmToggle = page.getByRole('button', { name: /Customer Relations/i });
    if ((await crmToggle.textContent())?.includes('Enable')) await crmToggle.click();

    // 1. Create booking as guest
    const guestState = JSON.parse(guestSession.storageState);
    await page.context().addCookies(guestState.cookies);
    await page.goto('/en/stay/safari-camp');
    await page.getByRole('button', { name: /Reserve Now/i }).click();
    await expect(page.getByText(/Booking Confirmed!/i)).toBeVisible();

    // 2. Check CRM history as manager
    const managerState = JSON.parse(managerSession.storageState);
    await page.context().addCookies(managerState.cookies);
    await page.goto('/en/manage/safari-camp/settings?tab=crm-history');

    await expect(
      page.getByRole('heading', { name: /Guest Interaction History/i }).first()
    ).toBeVisible();

    await page.goto('/en/guest');
    const activityWidget = page.getByRole('region', { name: /Recent Activity/i });
    await expect(activityWidget).toBeVisible();
    await expect(activityWidget).toContainText('BOOKING CREATED');
  });

  test('Scenario 5: Plugin remains isolated across listings', async ({ page, masterSession }) => {
    // TODO: Fix plugin component registration issue - booking widget not rendering
    const masterState = JSON.parse(masterSession.storageState);
    await page.context().addCookies(masterState.cookies);

    // Enable for Safari Camp, Disable for Mountain Lodge
    await page.goto('/en/admin/plugins');

    // Safari Camp -> Enable
    await page.getByRole('combobox').selectOption('1');
    const bookingToggle = page.getByRole('button', { name: /Marketplace Booking/i });
    if ((await bookingToggle.textContent())?.includes('Disabled')) await bookingToggle.click();

    // Mountain Lodge -> Disable (force disabled regardless of current state)
    await page.getByRole('combobox').selectOption('2');
    const bookingToggleMountain = page.getByRole('button', { name: /Marketplace Booking/i });
    if ((await bookingToggleMountain.textContent())?.includes('Disable'))
      await bookingToggleMountain.click();
    await expect(
      page.getByRole('button', { name: /Enable Marketplace Booking plugin/i })
    ).toBeVisible();

    // Verify Safari Camp has it
    await page.context().clearCookies();
    await page.goto('/en/stay/safari-camp');
    await expect(page.getByRole('region', { name: /Book Your Stay/i })).toBeVisible();

    // Verify Mountain Lodge doesn't
    await page.goto('/en/stay/mountain-lodge');
    await expect(page.getByRole('region', { name: /Book Your Stay/i })).not.toBeVisible();
  });
});
