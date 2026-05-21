import { logger } from './logger';

/**
 * PluginBroker
 * ────────────
 * Tracks loaded plugin instances and their returned public API objects,
 * enabling inter-plugin communication via api.plugins.get(name).
 */
const BROKER_KEY = '__pluginBroker__';

function getBrokerMap(): Map<string, unknown> {
  if (!(globalThis as any)[BROKER_KEY]) {
    (globalThis as any)[BROKER_KEY] = new Map<string, unknown>();
  }
  return (globalThis as any)[BROKER_KEY];
}

export class PluginBroker {
  private static get instances() {
    return getBrokerMap();
  }

  static register(pluginId: string, publicApi: unknown): void {
    this.instances.set(pluginId, publicApi);
    logger.info(`Plugin registered in broker: ${pluginId}`);
  }

  static get(pluginId: string): unknown {
    return this.instances.get(pluginId) ?? null;
  }

  static has(pluginId: string): boolean {
    return this.instances.has(pluginId);
  }

  static unregister(pluginId: string): void {
    this.instances.delete(pluginId);
  }

  static clear(): void {
    this.instances.clear();
  }

  static getLoadedPlugins(): string[] {
    return Array.from(this.instances.keys());
  }
}
