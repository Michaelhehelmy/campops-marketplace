import React from 'react';

/**
 * ComponentRegistry
 * ─────────────────
 * A central map of component keys (e.g., "pwa:PWAInstallBanner") to actual
 * React components. Plugins register their UI implementations here.
 */

export type RegisteredComponent = React.ComponentType<any>;

class ComponentRegistry {
  private components: Map<string, RegisteredComponent> = new Map();

  register(key: string, component: RegisteredComponent) {
    this.components.set(key, component);
  }

  get(key: string): RegisteredComponent | undefined {
    return this.components.get(key);
  }

  getAll(): Map<string, RegisteredComponent> {
    return new Map(this.components);
  }
}

export const componentRegistry = new ComponentRegistry();

if (typeof window !== 'undefined') {
  (window as any).componentRegistry = componentRegistry;
}
