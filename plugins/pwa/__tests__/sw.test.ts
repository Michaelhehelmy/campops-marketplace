import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('PWA Service Worker', () => {
  let installHandler: any;
  let activateHandler: any;
  let fetchHandler: any;
  let cacheAddAllSpy: any;
  let cacheOpenSpy: any;
  let cacheMatchSpy: any;
  let fetchSpy: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    installHandler = null;
    activateHandler = null;
    fetchHandler = null;

    // Stub global self
    const listeners: any = {};
    (global as any).self = {
      addEventListener: vi.fn().mockImplementation((event: string, handler: any) => {
        listeners[event] = handler;
      }),
    };

    cacheAddAllSpy = vi.fn().mockResolvedValue(undefined);
    cacheOpenSpy = vi.fn().mockResolvedValue({
      addAll: cacheAddAllSpy,
    });
    cacheMatchSpy = vi.fn().mockResolvedValue({ status: 200 });

    (global as any).caches = {
      open: cacheOpenSpy,
      match: cacheMatchSpy,
    };

    fetchSpy = vi.fn().mockResolvedValue({ status: 200 });
    (global as any).fetch = fetchSpy;

    // Load sw.ts dynamically
    await import('../src/sw');

    installHandler = listeners['install'];
    activateHandler = listeners['activate'];
    fetchHandler = listeners['fetch'];
  });

  afterEach(() => {
    delete (global as any).self;
    delete (global as any).caches;
    delete (global as any).fetch;
    vi.resetModules();
  });

  it('registers all event listeners', () => {
    expect(installHandler).toBeDefined();
    expect(activateHandler).toBeDefined();
    expect(fetchHandler).toBeDefined();
  });

  it('handles install event by pre-caching', async () => {
    const mockWaitUntil = vi.fn();
    const event = {
      waitUntil: mockWaitUntil,
    };

    await installHandler(event);

    expect(mockWaitUntil).toHaveBeenCalled();
    const promise = mockWaitUntil.mock.calls[0][0];
    await promise;

    expect(cacheOpenSpy).toHaveBeenCalledWith('sinaicamps-pwa-v1');
    expect(cacheAddAllSpy).toHaveBeenCalledWith(['/', '/offline', '/manifest.json']);
  });

  it('handles activate event', () => {
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    activateHandler({});
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('[PWA SW] Service Worker activated')
    );
    consoleLogSpy.mockRestore();
  });

  it('handles fetch event with network-first strategy (success)', async () => {
    const mockRespondWith = vi.fn();
    const event = {
      request: 'http://localhost/index.html',
      respondWith: mockRespondWith,
    };

    await fetchHandler(event);

    expect(mockRespondWith).toHaveBeenCalled();
    const promise = mockRespondWith.mock.calls[0][0];
    const response = await promise;

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/index.html');
    expect(response.status).toBe(200);
  });

  it('handles fetch event falling back to cache on network failure', async () => {
    fetchSpy.mockRejectedValue(new Error('Network down'));

    const mockRespondWith = vi.fn();
    const event = {
      request: 'http://localhost/index.html',
      respondWith: mockRespondWith,
    };

    await fetchHandler(event);

    expect(mockRespondWith).toHaveBeenCalled();
    const promise = mockRespondWith.mock.calls[0][0];
    const response = await promise;

    expect(fetchSpy).toHaveBeenCalledWith('http://localhost/index.html');
    expect(cacheMatchSpy).toHaveBeenCalledWith('http://localhost/index.html');
    expect(response.status).toBe(200);
  });
});
