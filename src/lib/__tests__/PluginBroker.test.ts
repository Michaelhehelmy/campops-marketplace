import { describe, it, expect, beforeEach } from 'vitest';
import { PluginBroker } from '../PluginBroker';

describe('PluginBroker', () => {
  beforeEach(() => {
    PluginBroker.clear();
  });

  it('should register and retrieve a plugin API', () => {
    PluginBroker.register('test-plugin', { doSomething: () => 'result' });
    const api = PluginBroker.get('test-plugin');
    expect(api).toEqual({ doSomething: expect.any(Function) });
  });

  it('should return null for unregistered plugin', () => {
    expect(PluginBroker.get('nonexistent')).toBeNull();
  });

  it('should report plugin existence correctly', () => {
    expect(PluginBroker.has('test-plugin')).toBe(false);
    PluginBroker.register('test-plugin', {});
    expect(PluginBroker.has('test-plugin')).toBe(true);
  });

  it('should unregister a plugin', () => {
    PluginBroker.register('test-plugin', {});
    PluginBroker.unregister('test-plugin');
    expect(PluginBroker.get('test-plugin')).toBeNull();
  });

  it('should list loaded plugins', () => {
    PluginBroker.register('plugin-a', {});
    PluginBroker.register('plugin-b', {});
    expect(PluginBroker.getLoadedPlugins()).toEqual(['plugin-a', 'plugin-b']);
  });

  it('should overwrite existing registration', () => {
    PluginBroker.register('test-plugin', { v: 1 });
    PluginBroker.register('test-plugin', { v: 2 });
    expect(PluginBroker.get('test-plugin')).toEqual({ v: 2 });
  });

  it('should clear all registrations', () => {
    PluginBroker.register('a', {});
    PluginBroker.register('b', {});
    PluginBroker.clear();
    expect(PluginBroker.getLoadedPlugins()).toEqual([]);
  });
});
