import type { ParcelConfig } from 'single-spa';

import singleSpaReact from 'single-spa-react';
import React from 'react';
import ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';
import { logger } from '@/lib/logger';

export type PluginParcelConfig = ParcelConfig & {
  // Add any custom metadata here if needed
};

class SlotManager {
  private parcels: Map<string, PluginParcelConfig> = new Map();
  private components: Map<string, React.ComponentType<any>> = new Map();

  /**
   * Helper method to register a React component as a single-spa parcel.
   * This matches the signature expected by plugin ui.tsx files.
   */
  register(componentId: string, Component: React.ComponentType<any>) {
    this.components.set(componentId, Component);

    const parcelConfig = singleSpaReact({
      React,
      ReactDOM,
      renderType: 'createRoot',
      createRoot: ReactDOMClient.createRoot,
      rootComponent: Component,
      errorBoundary(err: Error) {
        return (
          <div className="text-red-500 bg-red-50 p-2 rounded text-sm">
            Error rendering plugin component: {err.message}
          </div>
        );
      },
    } as any);
    this.registerParcel(componentId, parcelConfig);
  }

  /**
   * Gets the raw component for a given ID.
   */
  getComponent(componentId: string): React.ComponentType<any> | undefined {
    return this.components.get(componentId);
  }

  /**
   * Registers a Single-SPA parcel config for a specific component ID.
   */
  registerParcel(componentId: string, parcelConfig: PluginParcelConfig) {
    logger.info(`[SlotManager] Registering parcel for component: ${componentId}`);
    this.parcels.set(componentId, parcelConfig);
  }

  /**
   * Gets the registered parcel for a given component ID.
   */
  getParcel(componentId: string): PluginParcelConfig | undefined {
    return this.parcels.get(componentId);
  }

  /**
   * Clears all registered parcels.
   */
  clear() {
    this.parcels.clear();
  }
}

export const slotManager = new SlotManager();
