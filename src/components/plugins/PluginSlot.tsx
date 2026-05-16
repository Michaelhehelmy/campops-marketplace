'use client';

import React, { useEffect, useState } from 'react';
import { usePluginSlot } from './PluginRegistryProvider';
import { componentRegistry } from './ComponentRegistry';
import { logger } from '@/lib/logger';

interface PluginSlotProps {
  name: string;
  fallback?: React.ReactNode;
  props?: Record<string, any>;
}

/**
 * PluginSlot
 * ──────────
 * Renders all components registered for a specific slot name.
 *
 * Example: <PluginSlot name="dashboard.top" />
 */
export function PluginSlot({ name, fallback, props = {} }: PluginSlotProps) {
  const componentKeys = usePluginSlot(name);
  const [componentsLoaded, setComponentsLoaded] = useState(false);

  // Ensure plugins are loaded before rendering
  useEffect(() => {
    const loadPlugins = async () => {
      logger.info('[PluginSlot] Loading plugins...');
      try {
        const { initPlugins } = await import('@/lib/plugins-init');
        await initPlugins();
        logger.info('[PluginSlot] Plugins loaded, setting componentsLoaded = true');
        setComponentsLoaded(true);
      } catch (err) {
        logger.error('[PluginSlot] Failed to load plugins:', err);
        setComponentsLoaded(true); // Set to true anyway to avoid infinite loading
      }
    };
    loadPlugins();
  }, []);

  logger.info(
    '[PluginSlot] Rendering slot:',
    name,
    'componentKeys:',
    componentKeys,
    'componentsLoaded:',
    componentsLoaded
  );

  if (!componentsLoaded) {
    logger.info('[PluginSlot] Components not loaded yet, showing fallback');
    return <>{fallback}</>;
  }

  if (componentKeys.length === 0) {
    logger.info('[PluginSlot] No component keys for slot:', name, 'showing fallback');
    return <>{fallback}</>;
  }

  logger.info('[PluginSlot] Found component keys:', componentKeys, 'attempting to render');

  return (
    <>
      {componentKeys.map((key) => {
        const Component = componentRegistry.get(key);
        logger.info('[PluginSlot] Looking up component:', key, 'found:', !!Component);
        if (!Component) {
          logger.warn(`[PluginSlot] Component not found in registry: ${key}`);
          return null;
        }

        try {
          logger.info('[PluginSlot] Rendering component:', key);
          return <Component key={key} {...props} />;
        } catch (err) {
          logger.error(`[PluginSlot] Error rendering component ${key}:`, err);
          return null;
        }
      })}
    </>
  );
}
