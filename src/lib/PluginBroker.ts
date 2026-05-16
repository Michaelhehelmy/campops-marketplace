import { logger } from './logger';

/**
 * PluginBroker
 * ────────────
 * Tracks loaded plugin instances and their returned public API objects,
 * enabling inter-plugin communication via api.plugins.get(name).
 */
export class PluginBroker {
  private static instances = new Map<string, unknown>();

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
