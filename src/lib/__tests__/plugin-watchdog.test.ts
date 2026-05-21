import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordLoad,
  recordError,
  removeRecord,
  getPluginHealth,
  getPluginHealthSummary,
  clearRecords,
  startWatchdog,
  stopWatchdog,
} from '../plugin-watchdog';

describe('plugin-watchdog', () => {
  beforeEach(() => {
    clearRecords();
  });

  afterEach(() => {
    stopWatchdog();
  });

  it('records a healthy plugin load', () => {
    recordLoad('test-plugin', 'prop-123');

    const health = getPluginHealth();
    expect(health).toHaveLength(1);
    expect(health[0].pluginId).toBe('test-plugin');
    expect(health[0].propertyId).toBe('prop-123');
    expect(health[0].status).toBe('healthy');
    expect(health[0].loadedAt).toBeGreaterThan(0);
    expect(health[0].lastPingAt).toBeGreaterThan(0);
  });

  it('records a plugin error', () => {
    recordError('test-plugin', 'Connection refused');

    const health = getPluginHealth();
    expect(health).toHaveLength(1);
    expect(health[0].status).toBe('unhealthy');
    expect(health[0].error).toBe('Connection refused');
  });

  it('overwrites status on subsequent error', () => {
    recordLoad('test-plugin');
    recordError('test-plugin', 'Timed out');

    const health = getPluginHealth();
    expect(health[0].status).toBe('unhealthy');
    expect(health[0].error).toBe('Timed out');
  });

  it('removes a record', () => {
    recordLoad('test-plugin');
    expect(getPluginHealth()).toHaveLength(1);

    removeRecord('test-plugin');
    expect(getPluginHealth()).toHaveLength(0);
  });

  it('getPluginHealthSummary returns correct counts', () => {
    recordLoad('a');
    recordLoad('b');
    recordError('c', 'fail');

    const summary = getPluginHealthSummary();
    expect(summary.total).toBe(3);
    expect(summary.healthy).toBe(2);
    expect(summary.unhealthy).toBe(1);
  });

  it('startWatchdog does not throw', () => {
    expect(() => startWatchdog()).not.toThrow();
    expect(() => startWatchdog()).not.toThrow(); // idempotent
  });

  it('stopWatchdog is idempotent', () => {
    expect(() => stopWatchdog()).not.toThrow();
    expect(() => stopWatchdog()).not.toThrow();
  });

  it('uses system as default propertyId', () => {
    recordLoad('test-plugin');

    const health = getPluginHealth();
    expect(health[0].propertyId).toBeNull();
  });
});
