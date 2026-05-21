// ============================================================
// CampOps Tenant Service Worker
// Scope: Custom tenant domains (Ultimate plan)
//        e.g. acaciacamp.com, desertlodge.com
// Dynamically branded — manifest & theme loaded from API
// ============================================================

const CACHE_VERSION = 'v1';

// Cache name is keyed by hostname so each tenant has its own cache namespace
const hostname = self.location.hostname;
const STATIC_CACHE = `campops-tenant-${hostname}-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `campops-tenant-${hostname}-dynamic-${CACHE_VERSION}`;
const API_CACHE = `campops-tenant-${hostname}-api-${CACHE_VERSION}`;

const PRECACHE_ASSETS = ['/', '/offline'];

// Tenant-facing public API routes worth caching
const TENANT_CACHEABLE_API = [
  /\/api\/public\//,
  /\/api\/site\//,
  /\/api\/p\//, // plugin API endpoints (read-only)
];

// Never cache — mutations and auth
const NETWORK_ONLY_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/payments\//,
  /\/api\/manage\//,
  /\/api\/booking.*?(POST|PUT|DELETE)/,
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log(`[SW:tenant:${hostname}] Installing ${CACHE_VERSION}`);
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn(`[SW:tenant:${hostname}] Pre-cache partial failure:`, err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log(`[SW:tenant:${hostname}] Activating ${CACHE_VERSION}`);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith(`campops-tenant-${hostname}-`) &&
                key !== STATIC_CACHE &&
                key !== DYNAMIC_CACHE &&
                key !== API_CACHE
            )
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Network-only: auth & mutation APIs
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for cacheable tenant API routes
  if (TENANT_CACHEABLE_API.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }

  // Dynamic manifest served from API — cache short-term
  if (url.pathname.includes('manifest.webmanifest') || url.pathname.includes('/api/manifest')) {
    event.respondWith(networkFirst(request, API_CACHE, 3000));
    return;
  }

  // Static assets — stale-while-revalidate
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Images and fonts — cache-first (tenant branding images)
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation — network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE, 8000).catch(() =>
        caches.match('/offline').then(
          (r) =>
            r ||
            new Response('<h1>You are offline</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html' },
            })
        )
      )
    );
    return;
  }

  event.respondWith(networkFirst(request, DYNAMIC_CACHE, 5000));
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || hostname;
  const options = {
    body: data.body || 'You have a new notification.',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    data: data.url || '/',
    tag: data.tag || `${hostname}-notification`,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data || '/'));
});

// ── Background Sync ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-bookings') {
    event.waitUntil(syncPendingBookings());
  }
  if (event.tag === 'sync-availability') {
    event.waitUntil(syncAvailability());
  }
});

async function syncPendingBookings() {
  console.log(`[SW:tenant:${hostname}] Syncing pending bookings`);
}

async function syncAvailability() {
  console.log(`[SW:tenant:${hostname}] Syncing availability cache`);
}

// ── Strategies ────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName, timeoutMs) {
  const networkFetch = fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  });

  return Promise.race([
    networkFetch,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
  ]).catch(async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('Network and cache miss');
  });
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || networkPromise;
}
