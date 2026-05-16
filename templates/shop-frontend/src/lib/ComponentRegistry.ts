import React from "react";

export type PluginComponent = React.ComponentType<any>;

/**
 * ComponentRegistry
 * ─────────────────
 * A central lookup table that maps string keys (e.g., "pwa:PWAInstallBanner")
 * to actual React components. This allows the backend to drive UI injection
 * by sending component keys in the UI registry.
 */
class ComponentRegistry {
  private components: Map<string, PluginComponent> = new Map();

  /**
   * Register a component with a unique key.
   * Convention: "plugin-name:component-name"
   */
  register(key: string, component: PluginComponent) {
    if (this.components.has(key)) {
      console.warn(`[ComponentRegistry] Overwriting component for key: ${key}`);
    }
    this.components.set(key, component);
  }

  /**
   * Resolve a component by its key.
   */
  resolve(key: string): PluginComponent | undefined {
    return this.components.get(key);
  }

  /**
   * Get all registered keys.
   */
  getKeys(): string[] {
    return Array.from(this.components.keys());
  }
}

export const componentRegistry = new ComponentRegistry();
