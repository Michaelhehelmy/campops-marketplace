import React from "react";
import { componentRegistry } from "@/lib/ComponentRegistry";

/**
 * PWAInstallBanner
 * ────────────────
 * A banner that prompts the user to install the PWA.
 */
export function PWAInstallBanner() {
  return (
    <div className="bg-brand-600 text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-white/20 p-2 rounded-xl">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div>
          <h4 className="font-bold">Install CampOps App</h4>
          <p className="text-white/80 text-sm">
            Access your dashboard faster and get offline support.
          </p>
        </div>
      </div>
      <button className="bg-white text-brand-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors">
        Install Now
      </button>
    </div>
  );
}

/**
 * PWASettingsPage
 * ───────────────
 * Configuration for PWA features.
 */
export function PWASettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-900">PWA Settings</h3>
        <p className="text-gray-500 text-sm">Manage how your app behaves on mobile devices.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">Offline Mode</div>
            <div className="text-xs text-gray-500">Cache critical data for offline use.</div>
          </div>
          <div className="w-12 h-6 bg-brand-600 rounded-full relative">
            <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * bootstrapPWA
 * ────────────
 * Registers PWA components into the global registry.
 */
export function bootstrapPWA() {
  componentRegistry.register("pwa:PWAInstallBanner", PWAInstallBanner);
  componentRegistry.register("pwa:PWASettingsPage", PWASettingsPage);
}
