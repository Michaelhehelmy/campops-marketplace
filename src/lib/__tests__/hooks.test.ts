import { describe, it, expect, beforeEach, vi } from 'vitest';
import { hookManager } from '../hooks';

describe('HookManager', () => {
  beforeEach(() => {
    hookManager.clear();
  });

  it('registers a handler and returns unregister function', () => {
    const handler = async () => {};
    const unregister = hookManager.register('test-hook', handler);

    expect(typeof unregister).toBe('function');
  });

  it('executes registered handlers', async () => {
    const handler = vi.fn().mockResolvedValue('result');
    hookManager.register('test-hook', handler);

    const results = await hookManager.execute('test-hook', { data: 'test' });

    expect(handler).toHaveBeenCalled();
  });

  it('returns unregister function that removes handler', () => {
    const handler = vi.fn();
    const unregister = hookManager.register('test-hook', handler as any);

    unregister();

    // Handler should be removed
    const handlers = hookManager.getHandlers('test-hook');
    expect(handlers).not.toContain(handler);
  });

  it('clears all handlers', () => {
    hookManager.register('hook1', async () => {});
    hookManager.register('hook2', async () => {});

    hookManager.clear();

    expect(hookManager.hasRegistrations('hook1')).toBe(false);
    expect(hookManager.hasRegistrations('hook2')).toBe(false);
  });

  it('handles multiple handlers for same hook', async () => {
    const handler1 = vi.fn().mockImplementation((data) => data);
    const handler2 = vi.fn().mockImplementation((data) => data);

    hookManager.register('test-hook', handler1);
    hookManager.register('test-hook', handler2);

    await hookManager.execute('test-hook', { data: 'test' });

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('returns results from execution', async () => {
    const handler = vi.fn().mockImplementation((data) => ({ ...data, modified: true }));
    hookManager.register('test-hook', handler);

    const results = await hookManager.execute('test-hook', { data: 'test' });

    expect(results.modified).toBe(true);
  });

  it('clears specific hook by name', () => {
    hookManager.register('keep', async () => {});
    hookManager.register('clear-me', async () => {});

    hookManager.clear('clear-me');

    expect(hookManager.hasRegistrations('keep')).toBe(true);
    expect(hookManager.hasRegistrations('clear-me')).toBe(false);
  });

  it('clears non-existent hook name gracefully', () => {
    expect(() => hookManager.clear('non-existent')).not.toThrow();
  });

  it('provides backward compatibility exports', async () => {
    const { registerHook, executeHook } = await import('../hooks');
    const handler = vi.fn().mockImplementation((d) => d);

    registerHook('compat-hook', handler);
    await executeHook('compat-hook', { ok: true });

    expect(handler).toHaveBeenCalledWith({ ok: true });
  });

  it('handles unregistering multiple times gracefully', () => {
    const unregister = hookManager.register('once', async () => {});
    unregister();
    expect(() => unregister()).not.toThrow();
  });

  it('getHandlers returns empty array for non-existent hook', () => {
    expect(hookManager.getHandlers('missing')).toEqual([]);
  });
});
