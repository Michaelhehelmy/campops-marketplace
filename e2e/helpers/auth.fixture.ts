import { test as base, type APIRequestContext } from '@playwright/test';

/**
 * Authentication fixtures for different user roles
 *
 * Updated to use Better Auth sign-in endpoints.
 */

async function getStorageState(request: APIRequestContext, email: string) {
  let response: Awaited<ReturnType<typeof request.post>> | null = null;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      response = await request.post('http://localhost:3000/api/auth/sign-in/email', {
        headers: { Origin: 'http://localhost:3000' },
        data: { email, password: 'password123' },
        timeout: 30000,
      });
      if (response.ok()) break;
      lastError = new Error(`HTTP ${response.status()}`);
    } catch (e: any) {
      lastError = e;
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 2000 * attempt));
  }

  if (!response || !response.ok()) {
    const errorText = response ? await response.text() : (lastError?.message ?? 'timeout');
    console.error(`[Auth Fixture] Login failed for ${email} after 3 attempts:`, errorText);
    throw new Error(`Failed to log in as ${email}: ${errorText}`);
  }

  // Better Auth sets cookies in the response. Playwright request object manages these.
  const state = await request.storageState();

  // Also set a legacy sinaicamps_role cookie for the middleware
  const role = email.includes('master')
    ? 'master'
    : email.includes('manager')
      ? 'manager'
      : email.includes('staff')
        ? 'staff'
        : 'guest';
  state.cookies.push({
    name: 'sinaicamps_role',
    value: role,
    domain: 'localhost',
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  });

  return state;
}

export const test = base.extend<{
  guestSession: { storageState: string };
  managerSession: { storageState: string };
  masterSession: { storageState: string };
  staffSession: { storageState: string };
}>({
  guestSession: async ({ request }, use) => {
    const storageState = await getStorageState(request, 'guest@sinaicamps.com');
    await use({ storageState: JSON.stringify(storageState) });
  },

  managerSession: async ({ request }, use) => {
    const storageState = await getStorageState(request, 'manager@sinaicamps.com');
    await use({ storageState: JSON.stringify(storageState) });
  },

  masterSession: async ({ request }, use) => {
    const storageState = await getStorageState(request, 'master@sinaicamps.com');
    await use({ storageState: JSON.stringify(storageState) });
  },

  staffSession: async ({ request }, use) => {
    const storageState = await getStorageState(request, 'staff@sinaicamps.com');
    await use({ storageState: JSON.stringify(storageState) });
  },
});

export const expect = base.expect;
