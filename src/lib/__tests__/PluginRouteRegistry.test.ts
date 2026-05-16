import { describe, it, expect, beforeEach, vi } from 'vitest';
import { pluginRouteRegistry } from '../PluginRouteRegistry';

describe('PluginRouteRegistry', () => {
  beforeEach(() => {
    // Clear routes before each test using reflection since it's private
    (pluginRouteRegistry as any).routes = [];
  });

  it('registers a route and normalizes the path', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/api/p/test/route', 'GET', handler);

    const routes = pluginRouteRegistry.getAll();
    expect(routes).toHaveLength(1);
    expect(routes[0].pathPattern).toBe('/test/route');
    expect(routes[0].handlers.has('GET')).toBe(true);
  });

  it('normalizes paths without leading slashes', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', 'test/route', 'POST', handler);

    const routes = pluginRouteRegistry.getAll();
    expect(routes[0].pathPattern).toBe('/test/route');
  });

  it('normalizes paths starting with /api/', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/api/test/route', 'GET', handler);

    const routes = pluginRouteRegistry.getAll();
    expect(routes[0].pathPattern).toBe('/test/route');
  });

  it('merges handlers for the same path', () => {
    const handlerGet = vi.fn();
    const handlerPost = vi.fn();

    pluginRouteRegistry.register('plugin-1', '/test/route', 'GET', handlerGet);
    pluginRouteRegistry.register('plugin-1', '/test/route', 'POST', handlerPost);

    const routes = pluginRouteRegistry.getAll();
    expect(routes).toHaveLength(1);
    expect(routes[0].handlers.has('GET')).toBe(true);
    expect(routes[0].handlers.has('POST')).toBe(true);
  });

  it('retrieves a registered handler and extracts parameters', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/users/:userId/posts/:postId', 'GET', handler);

    const result = pluginRouteRegistry.get('/users/123/posts/456', 'GET');

    expect(result).not.toBeNull();
    expect(result!.handler.handler).toBe(handler);
    expect(result!.handler.pluginId).toBe('plugin-1');
    expect(result!.params).toEqual({
      userId: '123',
      postId: '456',
    });
  });

  it('normalizes the lookup path with leading slash', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/test/route', 'GET', handler);

    const result = pluginRouteRegistry.get('test/route', 'GET');
    expect(result).not.toBeNull();
  });

  it('returns null if route is not found', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/test/route', 'GET', handler);

    const result = pluginRouteRegistry.get('/not/found', 'GET');
    expect(result).toBeNull();
  });

  it('returns null if method does not match', () => {
    const handler = vi.fn();
    pluginRouteRegistry.register('plugin-1', '/test/route', 'GET', handler);

    const result = pluginRouteRegistry.get('/test/route', 'POST');
    expect(result).toBeNull();
  });
});
