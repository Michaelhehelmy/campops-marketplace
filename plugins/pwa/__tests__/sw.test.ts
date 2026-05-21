import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('PWA Service Worker - Marketplace', () => {
  let swCode: string;

  beforeEach(() => {
    const swPath = path.resolve(process.cwd(), 'public/sw-marketplace.js');
    swCode = fs.readFileSync(swPath, 'utf-8');
  });

  it('contains install event listener', () => {
    expect(swCode).toContain("addEventListener('install'");
    expect(swCode).toContain('waitUntil');
    expect(swCode).toContain('caches.open');
  });

  it('contains activate event listener', () => {
    expect(swCode).toContain("addEventListener('activate'");
    expect(swCode).toContain('clients.claim');
  });

  it('contains fetch event listener', () => {
    expect(swCode).toContain("addEventListener('fetch'");
    expect(swCode).toContain('respondWith');
  });

  it('defines a cache name', () => {
    expect(swCode).toMatch(/CACHE_VERSION|CACHE_NAME|cacheName|STATIC_CACHE/i);
  });

  it('pre-caches offline fallback and critical assets', () => {
    expect(swCode).toContain('/offline');
    expect(swCode).toContain('/sinaicamps.png');
  });
});

describe('PWA Service Worker - Tenant', () => {
  let swCode: string;

  beforeEach(() => {
    const swPath = path.resolve(process.cwd(), 'public/sw-tenant.js');
    swCode = fs.readFileSync(swPath, 'utf-8');
  });

  it('contains install event listener', () => {
    expect(swCode).toContain("addEventListener('install'");
    expect(swCode).toContain('waitUntil');
    expect(swCode).toContain('caches.open');
  });

  it('contains fetch event listener with tenant-specific API routes', () => {
    expect(swCode).toContain("addEventListener('fetch'");
    expect(swCode).toContain('\\/api\\/site\\/');
    expect(swCode).toContain('\\/api\\/p\\/');
  });

  it('defines a hostname-keyed cache namespace', () => {
    expect(swCode).toMatch(/hostname|location\.host/);
  });
});
