import { describe, it, expect, beforeEach, vi } from 'vitest';
import init, { PLUGIN_ID } from '../src/index';
import { makePluginAPI } from '../../../src/lib/PluginAPI';
import { db } from '../../../src/lib/db';

describe('PWA Plugin', () => {
  let api: any;

  beforeEach(async () => {
    // Reset database for each test
    await db.execute('DROP TABLE IF EXISTS plugin_pwa_settings');
    await db.execute('DROP TABLE IF EXISTS plugin_pwa_subscriptions');
    api = makePluginAPI(PLUGIN_ID);
  });

  it('should initialize and create settings and subscriptions tables', async () => {
    await init(api);

    const settingsExists = await api.db.tableExists('settings');
    const subsExists = await api.db.tableExists('subscriptions');
    expect(settingsExists).toBe(true);
    expect(subsExists).toBe(true);
  });

  it('should register hooks for listing page load', async () => {
    const registerHookSpy = vi.spyOn(api, 'registerHook');

    await init(api);

    expect(registerHookSpy).toHaveBeenCalledWith(
      'listing.public_page_loaded',
      expect.any(Function),
      expect.any(Number)
    );
  });

  it('should register UI components in correct slots', async () => {
    const addSlotComponentSpy = vi.spyOn(api.ui, 'addSlotComponent');

    await init(api);

    expect(addSlotComponentSpy).toHaveBeenCalledWith('listing.header', 'pwa:PWAInstallBanner');

    expect(addSlotComponentSpy).toHaveBeenCalledWith('dashboard.top', 'pwa:PWAInstallBanner');
  });

  it('should register a settings page', async () => {
    const addSettingsPageSpy = vi.spyOn(api.ui, 'addSettingsPage');

    await init(api);

    expect(addSettingsPageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'pwa-settings',
        label: 'PWA Settings',
      })
    );
  });
});
