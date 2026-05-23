'use client';

import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';

export default function OwnerRevenuePage() {
  return (
    <PluginRegistryProvider>
      <PluginShell
        name="owner.revenue"
        fallback={
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Revenue</h1>
            <p className="text-gray-500">Revenue reports will appear here once the feature is enabled.</p>
          </div>
        }
      />
    </PluginRegistryProvider>
  );
}
