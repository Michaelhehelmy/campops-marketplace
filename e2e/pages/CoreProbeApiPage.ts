import { APIRequestContext, expect } from '@playwright/test';

/**
 * API Page Object for the test-probe plugin routes.
 * Used by core E2E tests to verify framework integration points
 * without coupling to domain logic.
 */
export class CoreProbeApiPage {
  constructor(private request: APIRequestContext) {}

  async ping(propertySlug?: string) {
    const url = propertySlug ? `/api/test-probe/ping?slug=${propertySlug}` : '/api/test-probe/ping';
    const res = await this.request.get(url);
    return { status: res.status(), body: await res.json() };
  }

  async echo(body: Record<string, unknown>, propertySlug?: string) {
    const url = propertySlug ? `/api/test-probe/echo?slug=${propertySlug}` : '/api/test-probe/echo';
    const res = await this.request.post(url, { data: body });
    return { status: res.status(), body: await res.json() };
  }

  async rows(propertySlug?: string) {
    const url = propertySlug ? `/api/test-probe/rows?slug=${propertySlug}` : '/api/test-probe/rows';
    const res = await this.request.get(url);
    return { status: res.status(), body: await res.json() };
  }

  async uiRegistry(propertyId?: string, role?: string) {
    const params = new URLSearchParams();
    if (propertyId) params.set('propertyId', propertyId);
    if (role) params.set('role', role);
    const res = await this.request.get(`/api/plugins/ui-registry?${params.toString()}`);
    return { status: res.status(), body: await res.json() };
  }

  async resetDb() {
    const res = await this.request.post('/api/test/reset');
    return res.status();
  }
}
