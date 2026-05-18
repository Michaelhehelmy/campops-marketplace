import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initPlugins, loadPluginBundle } from '../plugins-init';
import { componentRegistry } from '@/components/plugins/ComponentRegistry';

vi.mock('@/components/plugins/ComponentRegistry', () => {
  const registerMock = vi.fn();
  const getAllMock = vi.fn().mockReturnValue(new Map());
  return {
    componentRegistry: {
      register: registerMock,
      getAll: getAllMock,
    },
  };
});

describe('Plugins Init Library', () => {
  let originalWindow: any;

  beforeEach(() => {
    originalWindow = global.window;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  it('should not register components if window is undefined (SSR mode)', async () => {
    // Force window to be undefined
    // @ts-expect-error - window does not exist on global in Node.js types but we delete it to simulate SSR
    delete global.window;

    await initPlugins();

    expect(componentRegistry.register).not.toHaveBeenCalled();
  });

  it('should register components if window is defined (browser mode)', async () => {
    // Stub window
    global.window = {} as any;

    await initPlugins();

    expect(componentRegistry.register).toHaveBeenCalled();
    // Verify core and plugin component registrations are registered
    expect(componentRegistry.register).toHaveBeenCalledWith('homepage.hero', expect.any(Function));
    expect(componentRegistry.register).toHaveBeenCalledWith(
      'pwa:PWAInstallBanner',
      expect.any(Function)
    );
    expect(componentRegistry.register).toHaveBeenCalledWith(
      'booking:PublicBookingWidget',
      expect.any(Function)
    );
    expect(componentRegistry.register).toHaveBeenCalledWith(
      'crm:ActivityWidget',
      expect.any(Function)
    );
  });

  it('should successfully resolve loadPluginBundle', async () => {
    await expect(
      loadPluginBundle('my-plugin', 'http://example.com/bundle.js')
    ).resolves.toBeUndefined();
  });
});
