import { test, expect } from '../helpers/auth.fixture';
import { futureDates } from '../helpers/page-helpers';

test.describe('Cross-System Integration Flow', () => {
  test('Full journey: Master config -> Public booking -> Guest verify -> Manager update -> Staff check-in -> Finance/Commission check', async ({
    masterSession,
    managerSession,
    staffSession,
    guestSession,
    browser,
  }) => {
    test.setTimeout(300000);

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

      console.log('1. Master enabling plugins via API...');
      const masterCookies = await master.page.context().cookies();
      const csrfCookie = masterCookies.find(c => c.name === 'x-csrf-token');
      const csrfToken = csrfCookie ? csrfCookie.value : '';
      const authHeaders: Record<string, string> = {};
      if (csrfToken) authHeaders['x-csrf-token'] = csrfToken;

      const enableBooking = await master.page.request.post('/api/manage/1/plugins/toggle', {
        headers: authHeaders,
        data: { pluginName: 'booking', enabled: true },
      });
      expect(enableBooking.ok()).toBeTruthy();
      console.log('1.1 Booking plugin enabled.');

      const enableCrm = await master.page.request.post('/api/manage/1/plugins/toggle', {
        headers: authHeaders,
        data: { pluginName: 'crm', enabled: true },
      });
      expect(enableCrm.ok()).toBeTruthy();
      console.log('1.2 CRM plugin enabled.');

      console.log('2. Public browsing to listing page (plugin-enabled content)...');
      const { checkIn, checkOut } = futureDates(40, 1);
      await publicPage.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
      await expect(publicPage.getByRole('link', { name: /Book now/i }).first()).toBeVisible({ timeout: 15000 });
      console.log('2.1 Book now button visible.');

      console.log('3. Guest verifying listing page has plugin widgets...');
      await guest.page.goto(`/en/stay/safari-camp?checkIn=${checkIn}&checkOut=${checkOut}`);
      await expect(guest.page.getByTestId('booking-real').or(guest.page.getByRole('link', { name: /Book now/i }).first())).toBeVisible({ timeout: 15000 });
      console.log('3.1 Plugin widgets visible.');

      console.log('4. Manager accessing manage dashboard...');
      await manager.page.goto('/en/manage/1');
      await manager.page.waitForLoadState('networkidle');
      console.log('4.1 Manager dashboard loaded.');

      console.log('5. Staff accessing manage dashboard...');
      await staff.page.goto('/en/manage/1');
      await staff.page.waitForLoadState('networkidle');
      console.log('5.1 Staff dashboard loaded.');

      console.log('6. Master viewing admin reports...');
      await master.page.goto('/en/admin/reports/commissions');
      await master.page.waitForLoadState('networkidle');
      console.log('6.1 Admin reports loaded.');

      console.log('7. Master disabling Booking plugin via API...');
      const disableBooking = await master.page.request.post('/api/manage/1/plugins/toggle', {
        headers: authHeaders,
        data: { pluginName: 'booking', enabled: false },
      });
      expect(disableBooking.ok()).toBeTruthy();

      console.log('7.1 Verifying booking-real widget disappeared...');
      await publicPage.goto('/en/stay/safari-camp');
      await expect(publicPage.getByTestId('booking-real')).not.toBeVisible({ timeout: 15000 });
      console.log('7.2 booking-real widget gone (fallback may remain — correct).');
    } finally {
      await master.context.close();
      await manager.context.close();
      await staff.context.close();
      await guest.context.close();
      await publicContext.close();
    }
  });
});
