'use client';

import React, { useEffect, useState } from 'react';
import Parcel from 'single-spa-react/parcel';
import { slotManager } from '@/lib/SlotManager';
import { mountRootParcel } from 'single-spa';
import { usePluginRegistry, usePluginSlot } from '@/components/plugins/PluginRegistryProvider';
import { componentRegistry } from '@/components/plugins/ComponentRegistry';
import { logger } from '@/lib/logger';

interface PluginShellProps {
  name: string;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

/**
 * PluginShell
 * ───────────
 * Renders all single-spa parcels registered for a specific slot name.
 * Replaces the legacy PluginSlot component.
 */
export function PluginShell({ name, fallback, props = {} }: PluginShellProps) {
  // Get active component keys for this slot from the backend registry
  const componentKeys = usePluginSlot(name);
  const { loading } = usePluginRegistry();

  const [componentsLoaded, setComponentsLoaded] = useState(false);

  useEffect(() => {
    logger.info(`[PluginShell] Searching for slot: ${name}, props:`, JSON.stringify(props));

    const loadPlugins = async () => {
      try {
        const { initFrontendPlugins } = await import('@/lib/plugins-frontend-init');
        await initFrontendPlugins();
        setComponentsLoaded(true);
      } catch (err) {
        logger.error('[PluginShell] Failed to load frontend plugins:', err);
        setComponentsLoaded(true);
      }
    };

    if (!componentsLoaded) {
      loadPlugins();
    }
  }, [componentsLoaded]);

  if (!componentsLoaded || loading) {
    return <>{fallback}</>;
  }

  if (componentKeys.length === 0) {
    return <>{fallback}</>;
  }

  // Resolve component keys to registered parcels/components
  const itemsToRender = componentKeys
    .map((key) => ({
      key,
      config: slotManager.getParcel(key),
      Component: slotManager.getComponent(key) || componentRegistry.get(key),
    }))
    .filter((item) => item.Component !== undefined);

  if (itemsToRender.length === 0) {
    logger.info(
      `[PluginShell] No components found for slot ${name}. Keys: ${componentKeys.join(', ')}`
    );
    return <>{fallback}</>;
  }

  logger.info(
    `[PluginShell] Rendering ${itemsToRender.length} components for slot ${name}:`,
    itemsToRender.map((i) => i.key)
  );

  return (
    <>
      {itemsToRender.map(({ key, config, Component }) => {
        // If we have a direct React component, render it directly for better stability
        // Single-spa parcels are great for cross-framework isolation, but for same-app
        // plugins, direct rendering is more robust in Next.js.
        if (Component) {
          const Comp = Component as any;
          return <Comp key={`${name}-${key}`} {...props} />;
        }

        // Fallback to parcel if only config is available
        return (
          <Parcel
            key={`${name}-${key}`}
            config={config!}
            mountParcel={mountRootParcel}
            wrapWith="div"
            className={`plugin-parcel slot-${name.replace('.', '-')}`}
            {...props}
          />
        );
      })}
    </>
  );
}
