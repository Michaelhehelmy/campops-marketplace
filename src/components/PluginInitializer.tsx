'use client';

import { useEffect } from 'react';
import { initPlugins } from '@/lib/plugins-init';

/**
 * PluginInitializer
 * ─────────────────
 * Initializes the plugin system on the client side.
 * This component should be rendered in the RootLayout to ensure
 * plugin components are registered before any PluginShell tries to use them.
 */
export default function PluginInitializer() {
  useEffect(() => {
    initPlugins().catch(console.error);
  }, []);

  return null;
}
