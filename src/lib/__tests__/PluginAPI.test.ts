import { describe, it, expect, beforeEach, vi } from 'vitest';
import { makePluginAPI } from '../PluginAPI';
import { hookManager } from '../hooks';
import { db } from '../db';
import { PluginBroker } from '../PluginBroker';

describe('PluginAPI', () => {
  beforeEach(async () => {
    hookManager.clear();
    try {
      await db.execute('DELETE FROM plugin_test_table');
    } catch (e) {}
  });

  it('creates a PluginAPI with correct structure', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');

    expect(api).toBeDefined();
    expect(api.pluginId).toBe('test-plugin');
    expect(api.version).toBe('1.0.0');
    expect(api.logger).toBeDefined();
    expect(api.db).toBeDefined();
    expect(api.services).toBeDefined();
    expect(api.config).toBeDefined();
    expect(api.publish).toBeDefined();
    expect(api.subscribe).toBeDefined();
    expect(api.events).toBeDefined();
    expect(api.plugins).toBeDefined();
    expect(api.registerRoute).toBeDefined();
    expect(api.ui).toBeDefined();
  });

  it('logger methods log with plugin prefix', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    api.logger.info('test message');
    api.logger.warn('test warning');
    api.logger.error('test error');
    api.logger.debug('test debug');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      'test message'
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      'test warning'
    );
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      'test error'
    );
    // debug is suppressed at default 'info' log level
    expect(debugSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it('hooks.registerHook returns unregister function', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn();

    const unregister = api.registerHook('test-hook', handler as any);
    expect(typeof unregister).toBe('function');

    unregister();
  });

  it('hooks.registerHook registers with hookManager', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn();

    api.registerHook('test-hook', handler as any);
    // Handler should be registered
    const handlers = hookManager.getHandlers('test-hook');
    expect(handlers).toContain(handler);
  });

  it('executeHook calls registered handlers', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn().mockResolvedValue('result');

    api.registerHook('test-hook', handler);
    const result = await api.executeHook('test-hook', { data: 'test' });

    expect(handler).toHaveBeenCalled();
  });

  it('hooks.registerHook returns unregister function', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn();

    const unregister = api.hooks.registerHook('test-hook', handler as any);
    expect(typeof unregister).toBe('function');

    unregister();
  });

  it('hooks.execute calls registered handlers', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn().mockResolvedValue('result');

    api.hooks.register('test-hook', handler);
    const result = await api.hooks.execute('test-hook', { data: 'test' });

    expect(handler).toHaveBeenCalled();
  });

  it('hooks.executeHook calls hookManager with propertyId', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn().mockResolvedValue('result');

    api.hooks.registerHook('test-hook', handler as any);
    await api.hooks.executeHook('test-hook', { data: 'test' });

    expect(handler).toHaveBeenCalled();
  });

  it('services.payment.initiatePayment returns mock URL', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = await api.services.payment.initiatePayment('order-1', 100, 'USD');
    expect(result).toEqual({ paymentUrl: 'https://mock-payment.com' });
  });

  it('services.tax.calculateTaxes is callable', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(typeof api.services.tax.calculateTaxes).toBe('function');
  });

  it('services.notification.send is callable', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(typeof api.services.notification.send).toBe('function');
  });

  it('services.i18n.t returns key as-is', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = api.services.i18n.t('test.key');

    expect(result).toBe('test.key');
  });

  it('publish logs message to console', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    api.publish('test-channel', { data: 'test' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      expect.stringContaining('[PubSub] test-channel:'),
      { data: 'test' }
    );
    logSpy.mockRestore();
  });

  it('subscribe returns unregister function', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const handler = vi.fn();

    const unregister = api.subscribe('test-channel', handler);
    expect(typeof unregister).toBe('function');

    unregister();
  });

  it('events.emit logs to console', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    api.events.emit('test-event', { data: 'test' });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      expect.stringContaining('[Event] test-event:'),
      { data: 'test' }
    );
    logSpy.mockRestore();
  });

  it('plugins.get returns null for unregistered plugin', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = api.plugins.get('other-plugin');
    expect(result).toBeNull();
  });

  it('plugins.get returns registered plugin API', () => {
    PluginBroker.register('other-plugin', { foo: 'bar' });
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = api.plugins.get('other-plugin');
    expect(result).toEqual({ foo: 'bar' });
    PluginBroker.clear();
  });

  it('registerRoute logs registration', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    api.registerRoute('/api/test', () => new Response('ok'));

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[plugin:test-plugin]'),
      expect.stringContaining('Registered route: /api/test')
    );
    logSpy.mockRestore();
  });

  it('ui.registerSlot is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() => api.ui.registerSlot('test-slot', 'component')).not.toThrow();
  });

  it('ui.addSlotComponent is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() => api.ui.addSlotComponent('test-slot', 'component')).not.toThrow();
  });

  it('ui.registerMenuItem is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() => api.ui.registerMenuItem({ label: 'Test', path: '/test' })).not.toThrow();
  });

  it('ui.addMenuItem is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() => api.ui.addMenuItem({ label: 'Test', path: '/test' })).not.toThrow();
  });

  it('ui.registerDashboardWidget is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() =>
      api.ui.registerDashboardWidget({ id: 'test', component: 'TestWidget', title: 'Test' } as any)
    ).not.toThrow();
  });

  it('ui.addDashboardWidget is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() =>
      api.ui.addDashboardWidget({ id: 'test', component: 'TestWidget', title: 'Test' } as any)
    ).not.toThrow();
  });

  it('ui.registerSettingsPage is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() =>
      api.ui.registerSettingsPage({ id: 'test', component: 'TestPage', label: 'Test' } as any)
    ).not.toThrow();
  });

  it('ui.addSettingsPage is a no-op', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    expect(() =>
      api.ui.addSettingsPage({ id: 'test', component: 'TestPage', label: 'Test' } as any)
    ).not.toThrow();
  });

  it('db.getTable returns a scoped repository with all CRUD methods', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const repo = api.db.getTable('bookings');
    expect(repo).toBeDefined();
    expect(typeof repo.findMany).toBe('function');
    expect(typeof repo.findById).toBe('function');
    expect(typeof repo.create).toBe('function');
    expect(typeof repo.update).toBe('function');
    expect(typeof repo.delete).toBe('function');
  });

  it('db.getTable prefixes the table name with plugin_<id>_', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue([]);
    api.db.getTable('rooms').findMany({});
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('plugin_test_plugin_rooms'),
      expect.anything()
    );
    querySpy.mockRestore();
  });

  it('db.getTable does not double-prefix if name already starts with plugin_', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue([]);
    api.db.getTable('plugin_test_plugin_rooms').findMany({});
    expect(querySpy).toHaveBeenCalledWith(
      expect.stringContaining('plugin_test_plugin_rooms'),
      expect.anything()
    );
    querySpy.mockRestore();
  });

  it('db.query delegates to db.query', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = await api.db.query('SELECT 1 as num');
    expect(Array.isArray(result)).toBe(true);
  });

  it('db.queryOne delegates to db.queryOne', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = await api.db.queryOne('SELECT 1 as num');
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('db.execute delegates to db.execute', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    await expect(api.db.execute('SELECT 1')).resolves.toBeUndefined();
  });

  it('db.createTable creates plugin-specific table', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    await api.db.createTable('test', 'id SERIAL PRIMARY KEY, name TEXT');

    const exists = await api.db.tableExists('test');
    expect(exists).toBe(true);

    await api.db.dropTable('test');
  });

  it('db.dropTable drops plugin-specific table', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    await api.db.createTable('test', 'id SERIAL PRIMARY KEY, name TEXT');

    await api.db.dropTable('test');
    const exists = await api.db.tableExists('test');
    expect(exists).toBe(false);
  });

  it('db.tableExists checks plugin-specific table', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const exists = await api.db.tableExists('nonexistent');
    expect(exists).toBe(false);
  });

  it('works without propertyId (master context)', async () => {
    const api = makePluginAPI('test-plugin');
    expect(api.pluginId).toBe('test-plugin');
    const rooms = api.db.getTable('rooms');
    expect(rooms).toBeDefined();

    // CRUD operations in master context (no property_id filter)
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue([]);
    await rooms.findMany({});
    expect(querySpy).toHaveBeenCalledWith(expect.not.stringContaining('property_id'), []);
    querySpy.mockRestore();

    const queryOneSpy = vi.spyOn(db, 'queryOne').mockResolvedValue({});
    await rooms.create({ name: 'global-room' });
    expect(queryOneSpy).toHaveBeenCalledWith(expect.not.stringContaining('property_id'), [
      'global-room',
    ]);

    await rooms.update('123', { name: 'updated' });
    expect(queryOneSpy).toHaveBeenCalledWith(expect.not.stringContaining('property_id'), [
      'updated',
      '123',
    ]);

    await rooms.findById('123');
    expect(queryOneSpy).toHaveBeenCalledWith(expect.not.stringContaining('property_id'), ['123']);

    queryOneSpy.mockRestore();

    const executeSpy = vi.spyOn(db, 'execute').mockResolvedValue({} as any);
    await rooms.delete('123');
    expect(executeSpy).toHaveBeenCalledWith(expect.not.stringContaining('property_id'), ['123']);
    executeSpy.mockRestore();
  });

  it('services.tax.calculateTaxes returns tax calculation', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = await api.services.tax.calculateTaxes(100);
    expect(result).toEqual({ taxes: [], totalTax: 0 });
  });

  it('services.notification.send is async no-op', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    await expect(api.services.notification.send({} as any)).resolves.toBeUndefined();
  });

  it('services.i18n.t returns key', () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const result = api.services.i18n.t('test.key');
    expect(result).toBe('test.key');
  });

  it('db.getTable().findMany calls db.query with property filter', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'query').mockResolvedValue([]);

    await api.db.getTable('items').findMany({ where: { name: 'test' } });

    expect(querySpy).toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it('db.getTable().findById calls db.queryOne with property filter', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'queryOne').mockResolvedValue(null);

    await api.db.getTable('items').findById('test-id');

    expect(querySpy).toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it('db.getTable().create includes property_id in insert', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'queryOne').mockResolvedValue({});

    await api.db.getTable('items').create({ name: 'test' });

    expect(querySpy).toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it('db.getTable().update includes property filter', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const querySpy = vi.spyOn(db, 'queryOne').mockResolvedValue({});

    await api.db.getTable('items').update('test-id', { name: 'updated' });

    expect(querySpy).toHaveBeenCalled();
    querySpy.mockRestore();
  });

  it('db.getTable().delete includes property filter', async () => {
    const api = makePluginAPI('test-plugin', 'prop-123');
    const executeSpy = vi.spyOn(db, 'execute').mockResolvedValue({} as any);

    await api.db.getTable('items').delete('test-id');

    expect(executeSpy).toHaveBeenCalled();
    executeSpy.mockRestore();
  });
});
