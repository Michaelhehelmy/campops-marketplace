/**
 * PWA Service Worker Placeholder
 * ─────────────────────────────
 * Demonstrates offline readiness and lifecycle logging.
 */

const CACHE_NAME = 'sinaicamps-pwa-v1';

self.addEventListener('install', (event: any) => {
  console.log('[PWA SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching offline assets');
      return cache.addAll(['/', '/offline', '/manifest.json']);
    })
  );
});

self.addEventListener('activate', (event: any) => {
  console.log('[PWA SW] Service Worker activated');
});

self.addEventListener('fetch', (event: any) => {
  // Simple network-first strategy
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
