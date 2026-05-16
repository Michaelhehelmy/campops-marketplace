'use client';

import { PluginRegistryProvider } from '@/components/plugins/PluginRegistryProvider';
import { PluginShell } from '@/app/PluginShell';

export default function OwnerBookingsPage() {
  return (
    <PluginRegistryProvider>
      <PluginShell
        name="owner.bookings"
        fallback={
          <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Bookings</h1>
            <p className="text-gray-500">Bookings functionality not available</p>
          </div>
        }
      />
    </PluginRegistryProvider>
  );
}
