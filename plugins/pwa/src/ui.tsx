'use client';

import React, { useState, useEffect } from 'react';

/**
 * PWAInstallBanner
 * ────────────────
 * A banner that prompts the user to install the PWA.
 * Reacts to the 'beforeinstallprompt' event.
 */
export function PWAInstallBanner({ listingId }: { listingId?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isPluginEnabled, setIsPluginEnabled] = useState(false);

  useEffect(() => {
    // Check if the PWA plugin is actually enabled for this property
    if (listingId) {
      fetch(`/api/public/plugins?property=${listingId}`)
        .then((res) => res.json())
        .then((data) => {
          const pwaPlugin = data.plugins?.find((p: any) => p.name === 'pwa');
          setIsPluginEnabled(!!pwaPlugin?.isActive);
        })
        .catch((err) => console.error('Failed to verify PWA plugin status', err));
    } else {
      // If no listingId is provided (e.g. global dashboard), we assume it's enabled
      // or rely on the pwa-preview flag.
      setIsPluginEnabled(true);
    }

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if already installed
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      setIsVisible(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [listingId]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice: ${outcome}`);
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  // Show preview in dev if localStorage is set
  const showPreview =
    typeof window !== 'undefined' && window.localStorage.getItem('pwa-preview') === 'true';

  if (!isPluginEnabled && !showPreview) {
    return null;
  }

  if (!isVisible && !deferredPrompt && !showPreview) {
    return null;
  }

  return (
    <div
      data-testid="pwa-install-banner"
      className="bg-brand-600 text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-500"
    >
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
          <p className="text-white/80 text-sm">Access your stays faster and get offline support.</p>
        </div>
      </div>
      <button
        aria-label="Install App"
        onClick={handleInstallClick}
        className="bg-white text-brand-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors shadow-sm"
      >
        Install Now
      </button>
    </div>
  );
}

/**
 * PWAInstallButton
 * ────────────────
 * A smaller version of the install prompt, suitable for navbars or footers.
 */
export function PWAInstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt) return null;

  return (
    <button
      aria-label="Add to Home Screen"
      onClick={() => deferredPrompt.prompt()}
      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      Add to Home Screen
    </button>
  );
}

/**
 * PWASettingsPage
 * ───────────────
 * Configuration for PWA features.
 */
export function PWASettingsPage() {
  const [offlineEnabled, setOfflineEnabled] = useState(true);

  return (
    <div className="space-y-6" data-testid="pwa-settings-page">
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
          <button
            aria-label="Toggle Offline Mode"
            onClick={() => setOfflineEnabled(!offlineEnabled)}
            className={`w-12 h-6 rounded-full relative transition-colors ${offlineEnabled ? 'bg-brand-600' : 'bg-gray-200'}`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${offlineEnabled ? 'right-1' : 'left-1'}`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Registers PWA components with the global component registry.
 */
export function registerPlugin(registry: any) {
  registry.register('pwa:PWAInstallBanner', PWAInstallBanner);
  registry.register('pwa:PWAInstallButton', PWAInstallButton);
  registry.register('pwa:PWASettingsPage', PWASettingsPage);
}
