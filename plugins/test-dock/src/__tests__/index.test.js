import { describe, it, expect, vi, beforeEach } from 'vitest';
import { init } from '../index';

describe('test-dock plugin', () => {
  let mockApi;

  beforeEach(() => {
    mockApi = {
      logger: {
        info: vi.fn(),
        error: vi.fn(),
      },
      db: {
        createTable: vi.fn().mockResolvedValue(true),
      },
      hooks: {
        executeHook: vi.fn().mockResolvedValue({}),
        registerHook: vi.fn(),
      },
      ui: {
        registerMenuItem: vi.fn(),
        registerSlot: vi.fn(),
      },
      registerRoute: vi.fn(),
      pluginId: 'test-dock',
    };
  });

  it('initializes correctly', async () => {
    await init(mockApi);

    expect(mockApi.logger.info).toHaveBeenCalledWith('Test Dock Plugin initializing...');
    expect(mockApi.db.createTable).toHaveBeenCalledWith('dummy', 'name TEXT');
    expect(mockApi.registerRoute).toHaveBeenCalledWith('/api/test-dock', expect.any(Object));
    expect(mockApi.hooks.registerHook).toHaveBeenCalledWith(
      'payment.success',
      expect.any(Function),
      10
    );
    expect(mockApi.ui.registerMenuItem).toHaveBeenCalled();
    expect(mockApi.ui.registerSlot).toHaveBeenCalledWith('dashboard.widgets', 'test-dock-widget');
  });

  it('executes hook in the ping route', async () => {
    await init(mockApi);

    // Extract the router and the handler
    const router = mockApi.registerRoute.mock.calls[0][1];
    const pingHandler = router.routes.find((r) => r.path === '/ping').handler;

    const mockContext = {
      json: vi.fn((data) => data),
      get: vi.fn().mockReturnValue('test-property'),
    };

    await pingHandler(mockContext);

    expect(mockApi.hooks.executeHook).toHaveBeenCalledWith('payment.success', {
      amount: 50,
      test: true,
    });
    expect(mockContext.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pong: true,
        tenant: 'test-property',
        plugin: 'test-dock',
      })
    );
  });

  it('handles the registered hook', async () => {
    await init(mockApi);

    // Extract the hook handler
    const hookHandler = mockApi.hooks.registerHook.mock.calls[0][1];
    const testData = { foo: 'bar' };

    const result = await hookHandler(testData);

    expect(mockApi.logger.info).toHaveBeenCalledWith(
      expect.stringContaining('HOT RELOADED hook fired'),
      testData
    );
    expect(result).toBe(testData);
  });
});
