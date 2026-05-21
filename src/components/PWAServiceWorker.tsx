'use client';

import { useEffect } from 'react';

/**
 * PWAServiceWorker
 *
 * Registers the correct service worker based on the current context:
 *  - Tenant custom domain (Ultimate plan) → sw-tenant.js
 *    Scope is the tenant domain; manifest is loaded dynamically from /api/manifest.webmanifest
 *  - Main marketplace domain (sinaicamps.com) → sw-marketplace.js
 *    Covers admins, managers, master users, and guests on the main platform
 *
 * Both SWs implement: cache strategies, offline fallback, push notifications, background sync.
 */
export default function PWAServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (!window.isSecureContext) return;

    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const BASE_DOMAIN = process.env.NEXT_PUBLIC_BASE_DOMAIN ?? 'sinaicamps.com';

    // Determine if we are on a tenant custom domain (not sinaicamps.com and not a subdomain of it)
    const isMainDomain =
      hostname === BASE_DOMAIN ||
      hostname === `www.${BASE_DOMAIN}` ||
      hostname.endsWith(`.${BASE_DOMAIN}`);

    const swPath = isMainDomain ? '/sw-marketplace.js' : '/sw-tenant.js';

    // Skip registration in localhost to avoid stale caches during development
    if (isLocalhost) {
      console.log('[PWA] Skipping SW registration in localhost');
      return;
    }

    navigator.serviceWorker
      .register(swPath, { scope: '/' })
      .then((reg) => {
        console.log(`[PWA] Service worker registered: ${swPath}`, reg);

        // Notify user of updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New service worker available. Refresh to update.');
              // Could dispatch a custom event here to show an update banner
              window.dispatchEvent(new CustomEvent('pwa:update-available'));
            }
          });
        });
      })
      .catch((err) => console.error(`[PWA] SW registration failed (${swPath}):`, err));
  }, []);

  return null;
}
