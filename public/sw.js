// CampOps Marketplace - PWA Service Worker
const CACHE_NAME = 'campops-v1';

self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
});

self.addEventListener('fetch', (event) => {
  // Simple pass-through for now
  // In a real plugin, this would handle offline caching
});
