// ============================================================
// CampOps Marketplace — Main Platform Service Worker
// Scope: sinaicamps.com (admins, managers, master, guests)
// ============================================================

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `sinaicamps-marketplace-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `sinaicamps-marketplace-dynamic-${CACHE_VERSION}`;
const API_CACHE = `sinaicamps-marketplace-api-${CACHE_VERSION}`;

// Assets to pre-cache on install (app shell)
const PRECACHE_ASSETS = ['/', '/en', '/en/login', '/sinaicamps.png', '/offline'];

// API routes to cache with network-first strategy
const API_CACHE_PATTERNS = [/\/api\/public\//, /\/api\/properties/];

// Routes that should always go to network
const NETWORK_ONLY_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/payments\//,
  /\/api\/manage\//,
  /\/api\/master\//,
  /\/api\/admin\//,
  /\/api\/owner\//,
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW:marketplace] Installing v' + CACHE_VERSION);
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS).catch((err) => {
          console.warn('[SW:marketplace] Pre-cache partial failure:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW:marketplace] Activating v' + CACHE_VERSION);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith('sinaicamps-marketplace-') &&
                key !== STATIC_CACHE &&
                key !== DYNAMIC_CACHE &&
                key !== API_CACHE
            )
            .map((key) => {
              console.log('[SW:marketplace] Deleting old cache:', key);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-GET and non-HTTP requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // Network-only for sensitive API routes (auth, payments, mutations)
  if (NETWORK_ONLY_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(fetch(request));
    return;
  }

  // Network-first for cacheable API routes
  if (API_CACHE_PATTERNS.some((p) => p.test(url.pathname))) {
    event.respondWith(networkFirst(request, API_CACHE, 5000));
    return;
  }

  // Stale-while-revalidate for Next.js static assets
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // Cache-first for images/icons
  if (/\.(png|jpg|jpeg|webp|gif|svg|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Network-first with offline fallback for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, DYNAMIC_CACHE, 8000).catch(() =>
        caches.match('/offline').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Default: network-first
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, 5000));
});

// ── Push Notifications ────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'CampOps';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: '/sinaicamps.png',
    badge: '/sinaicamps.png',
    data: data.url || '/',
    tag: data.tag || 'sinaicamps-notification',
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
});

async function syncPendingBookings() {
  // Placeholder: flush any pending offline booking attempts from IndexedDB
  console.log('[SW:marketplace] Background sync: bookings');
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
  const cached = caches.match(request);
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
  ]).catch(() => cached.then((r) => r || Promise.reject(new Error('Network and cache miss'))));
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
