import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index';

describe('PWA Plugin', () => {
  let mockApi: any;

  beforeEach(() => {
    mockApi = {
      pluginId: 'pwa',
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
      db: {
        createTable: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
      },
      ui: {
        addSlotComponent: vi.fn(),
        addSettingsPage: vi.fn(),
      },
      registerHook: vi.fn(),
    };
  });

  it('should initialize and register core features', async () => {
    await init(mockApi);

    // Verify DB table creation
    expect(mockApi.db.createTable).toHaveBeenCalledWith(
      'subscriptions',
      expect.stringContaining('guest_id UUID')
    );

    // Verify UI slot registration
    expect(mockApi.ui.addSlotComponent).toHaveBeenCalledWith(
      'listing.header',
      'pwa:PWAInstallBanner'
    );
    expect(mockApi.ui.addSlotComponent).toHaveBeenCalledWith(
      'dashboard.top',
      'pwa:PWAInstallBanner'
    );

    // Verify Settings Page registration
    expect(mockApi.ui.addSettingsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pwa-settings',
        label: 'PWA Settings',
      })
    );

    expect(mockApi.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Initialising PWA plugin')
    );
  });

  it('should register and handle listing.public_page_loaded hook', async () => {
    await init(mockApi);

    expect(mockApi.registerHook).toHaveBeenCalledWith(
      'listing.public_page_loaded',
      expect.any(Function),
      100
    );

    const handler = mockApi.registerHook.mock.calls.find(
      (call: any) => call[0] === 'listing.public_page_loaded'
    )[1];

    const data = { path: '/test-camp' };
    const result = await handler(data);

    expect(result).toEqual(data);
    expect(mockApi.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Page loaded: /test-camp')
    );
  });
});
