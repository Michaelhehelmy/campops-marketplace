# OpenCode Performance Optimization Prompt

## Executive Summary

**Goal**: Optimize SinaiCamps marketplace for production-scale performance  
**Current Baseline**: Measure first, then optimize  
**Target Metrics**:
- API Response Time: p95 < 100ms (currently ~200-500ms)
- Database Query Time: < 50ms per query
- First Contentful Paint: < 1.5s (currently ~2-3s)
- Bundle Size: < 200KB initial JS (currently ~350KB+)
- Cache Hit Rate: > 80% for static assets

---

## Phase 1: Database Performance (Priority: CRITICAL)

**Agents**: @db_architect + @backend_architect

### 1.1 Add Critical Indexes

Analyze slow queries and add indexes. Check current queries first:

```bash
# Find all db.query calls
grep -r "db.query\|db.execute" src/ plugins/ --include="*.ts" | head -50
```

**Create Migration** (`src/db/migrations/013_performance_indexes.sql`):

```sql
-- Booking Plugin Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_listing_checkin ON plugin_booking_bookings(listing_id, check_in);
CREATE INDEX IF NOT EXISTS idx_bookings_listing_status ON plugin_bookings(listing_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_email ON plugin_bookings(guest_email);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON plugin_bookings(check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_bookings_created ON plugin_bookings(created_at DESC);

-- Availability Indexes
CREATE INDEX IF NOT EXISTS idx_availability_room_date ON plugin_booking_room_availability(room_id, date);
CREATE INDEX IF NOT EXISTS idx_availability_available ON plugin_booking_room_availability(date, available) WHERE available > 0;

-- Housekeeping Indexes
CREATE INDEX IF NOT EXISTS idx_housekeeping_room_status ON plugin_housekeeping_tasks(room_id, status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_assigned ON plugin_housekeeping_tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_housekeeping_created ON plugin_housekeeping_tasks(created_at DESC);

-- POS Indexes
CREATE INDEX IF NOT EXISTS idx_pos_orders_status_date ON plugin_pos_orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_orders_table ON plugin_pos_orders(table_id, status);
CREATE INDEX IF NOT EXISTS idx_pos_order_items_order ON plugin_pos_order_items(order_id);

-- Inventory Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON plugin_inventory_transactions(item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON plugin_inventory_transactions(transaction_type, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON plugin_inventory_stock(quantity_available) WHERE quantity_available <= 10;

-- Staff Indexes
CREATE INDEX IF NOT EXISTS idx_staff_shifts_employee ON staff_shifts(user_id, shift_start);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_dates ON staff_shifts(shift_start, shift_end);
CREATE INDEX IF NOT EXISTS idx_time_clocks_employee ON plugin_staff_time_clocks(employee_id, clock_in DESC);

-- Tenant/CMS Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_pages_slug ON tenant_pages(tenant_id, slug);
CREATE INDEX IF NOT EXISTS idx_tenant_pages_published ON tenant_pages(tenant_id, is_published);

-- Property/Listing Indexes
CREATE INDEX IF NOT EXISTS idx_properties_slug ON properties(slug);
CREATE INDEX IF NOT EXISTS idx_properties_plan ON properties(plan);
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(is_active) WHERE is_active = 1;

-- User/Auth Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_property_staff_property ON property_staff(property_id);
CREATE INDEX IF NOT EXISTS idx_property_staff_user ON property_staff(user_id);

-- OTA/Integration Indexes
CREATE INDEX IF NOT EXISTS idx_ota_channels_property ON plugin_ota_channels(property_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ota_reservations_channel ON plugin_ota_reservations(channel_id, imported_at DESC);
CREATE INDEX IF NOT EXISTS idx_external_calendars_property ON plugin_integrations_external_calendars(property_id);

-- Compound indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_bookings_listing_status_date ON plugin_booking_bookings(listing_id, status, check_in DESC);
CREATE INDEX IF NOT EXISTS idx_housekeeping_status_priority ON plugin_housekeeping_tasks(status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_category_active ON plugin_inventory_items(category_id) WHERE is_active = 1;
```

**Verify with Query Plan**:
```sql
-- Test index effectiveness
EXPLAIN QUERY PLAN 
SELECT * FROM plugin_booking_bookings 
WHERE listing_id = '1' AND status = 'confirmed' 
ORDER BY check_in DESC;
-- Should show "USING INDEX" not "SCAN"
```

### 1.2 Query Optimization

**N+1 Problem Fix** (`src/lib/api.ts`):

```typescript
// BEFORE (N+1 problem):
const properties = await db.query('SELECT * FROM properties');
for (const p of properties) {
  const bookings = await db.query('SELECT * FROM bookings WHERE listing_id = ?', [p.id]);
  // ... more queries
}

// AFTER (Single JOIN query):
const propertiesWithStats = await db.query(`
  SELECT 
    p.*,
    COUNT(b.id) as booking_count,
    SUM(b.total_price) as total_revenue
  FROM properties p
  LEFT JOIN plugin_booking_bookings b ON b.listing_id = p.id AND b.status = 'confirmed'
  WHERE p.is_active = 1
  GROUP BY p.id
`);
```

**Batch Queries** (`src/lib/PostQuery.ts`):

```typescript
// Add batch query method
async function batchQuery(siteIds: string[], options: QueryOptions) {
  const placeholders = siteIds.map(() => '?').join(',');
  return await db.query(`
    SELECT * FROM posts 
    WHERE site_id IN (${placeholders})
      AND post_type = ?
      AND post_status = ?
    ORDER BY menu_order
  `, [...siteIds, options.postType, options.status]);
}
```

### 1.3 Database Connection Pooling

**For PostgreSQL Production** (`src/lib/db.ts`):

```typescript
import { Pool } from 'pg';

const isPostgres = process.env.DATABASE_URL?.includes('postgresql');

let pgPool: Pool | null = null;

if (isPostgres) {
  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20, // Maximum number of clients in pool
    min: 5,  // Minimum number of clients to maintain
    idleTimeoutMillis: 30000, // Close idle clients after 30s
    connectionTimeoutMillis: 2000, // Return error after 2s if connection fails
    statement_timeout: 10000, // Cancel queries after 10s
  });
  
  // Error handling
  pgPool.on('error', (err) => {
    logger.error('Unexpected PG pool error', err);
  });
}

export async function queryWithPool(sql: string, params?: any[]) {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized');
  
  const client = await pgPool.connect();
  try {
    const start = Date.now();
    const result = await client.query(sql, params);
    const duration = Date.now() - start;
    
    if (duration > 100) {
      logger.warn(`Slow query (${duration}ms): ${sql.substring(0, 100)}`);
    }
    
    return result;
  } finally {
    client.release();
  }
}
```

---

## Phase 2: API Response Caching (Priority: HIGH)

**Agents**: @backend_architect + @devops

### 2.1 In-Memory Cache Layer

**Create Cache Utility** (`src/lib/cache.ts`):

```typescript
import NodeCache from 'node-cache';
import { logger } from './logger';

// Cache configuration by data type
const caches = {
  // Static data - cache 1 hour
  static: new NodeCache({ stdTTL: 3600, checkperiod: 600 }),
  
  // Availability data - cache 5 minutes
  availability: new NodeCache({ stdTTL: 300, checkperiod: 60 }),
  
  // Session data - cache 15 minutes
  session: new NodeCache({ stdTTL: 900, checkperiod: 300 }),
  
  // Tenant data - cache 10 minutes
  tenant: new NodeCache({ stdTTL: 600, checkperiod: 120 }),
  
  // Computed analytics - cache 1 hour
  analytics: new NodeCache({ stdTTL: 3600, checkperiod: 600 }),
};

export async function cachedQuery<T>(
  cacheType: keyof typeof caches,
  key: string,
  ttl: number | undefined,
  fn: () => Promise<T>
): Promise<T> {
  const cache = caches[cacheType];
  const cached = cache.get<T>(key);
  
  if (cached !== undefined) {
    logger.debug(`Cache hit: ${key}`);
    return cached;
  }
  
  logger.debug(`Cache miss: ${key}`);
  const result = await fn();
  
  const actualTtl = ttl || cache.options.stdTTL;
  cache.set(key, result, actualTtl);
  
  return result;
}

export function invalidateCache(cacheType: keyof typeof caches, pattern?: string) {
  const cache = caches[cacheType];
  
  if (pattern) {
    const keys = cache.keys().filter(k => k.includes(pattern));
    cache.del(keys);
    logger.info(`Invalidated ${keys.length} cache entries matching: ${pattern}`);
  } else {
    cache.flushAll();
    logger.info(`Flushed all ${cacheType} cache`);
  }
}

export function getCacheStats() {
  return Object.entries(caches).map(([name, cache]) => ({
    name,
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    hitRate: cache.getStats().hits / (cache.getStats().hits + cache.getStats().misses),
  }));
}
```

### 2.2 Apply Caching to API Routes

**Tenant Resolution** (`src/middleware.ts`):

```typescript
// Cache tenant resolution (expensive hostname lookup)
const CACHE_TTL_TENANT = 60; // 1 minute

async function resolveTenant(hostname: string) {
  return await cachedQuery('tenant', `tenant:${hostname}`, CACHE_TTL_TENANT, async () => {
    const res = await fetch(`${API_URL}/api/tenant/resolve?host=${encodeURIComponent(hostname)}`, {
      next: { revalidate: 60 }
    });
    return res.ok ? await res.json() : null;
  });
}
```

**Booking Availability** (`plugins/booking/src/api/routes.ts`):

```typescript
// Cache availability checks (expensive date range queries)
api.registerRoute('/api/p/booking/check-availability', async (req) => {
  const body = await req.json();
  const cacheKey = `availability:${body.listingId}:${body.checkIn}:${body.checkOut}:${body.adults}`;
  
  const result = await cachedQuery('availability', cacheKey, 60, async () => {
    const validated = checkAvailabilitySchema.parse(body);
    return await roomService.checkAvailability(validated);
  });
  
  return Response.json({ availableRooms: result });
});

// Invalidate cache when booking is made
api.registerHook('BOOKING_CREATED', async (data) => {
  invalidateCache('availability', `availability:${data.listingId}:`);
});
```

**Public Data Endpoints** (`src/app/api/public/`):

```typescript
// Homepage config - cache 1 hour
export async function GET() {
  const config = await cachedQuery('static', 'homepage:config', 3600, async () => {
    return await db.query('SELECT * FROM marketplace_settings WHERE id = ?', ['marketplace_settings']);
  });
  
  return Response.json(config);
}
```

### 2.3 Redis for Distributed Caching (Optional)

**For multi-server deployments** (`src/lib/redis.ts`):

```typescript
import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

export async function redisGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const value = await redis.get(key);
  return value ? JSON.parse(value) : null;
}

export async function redisSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  if (!redis) return;
  await redis.setex(key, ttlSeconds, JSON.stringify(value));
}

export async function redisInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
```

---

## Phase 3: Frontend Performance (Priority: HIGH)

**Agents**: @frontend_marketplace + @frontend_dashboards

### 3.1 Code Splitting

**Dynamic Imports for Heavy Components**:

```typescript
// src/app/[locale]/page.tsx
import { Suspense, lazy } from 'react';

// Lazy load heavy components
const HeroSection = lazy(() => import('@/components/homepage/HeroSection'));
const FeaturedListings = lazy(() => import('@/components/homepage/FeaturedListings'));
const Categories = lazy(() => import('@/components/homepage/Categories'));

// Loading skeletons
function SectionSkeleton() {
  return <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />;
}

export default function HomePage() {
  return (
    <main>
      <Suspense fallback={<SectionSkeleton />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <FeaturedListings />
      </Suspense>
      <Suspense fallback={<SectionSkeleton />}>
        <Categories />
      </Suspense>
    </main>
  );
}
```

**Route-Based Code Splitting** (`src/app/[locale]/admin/layout.tsx`):

```typescript
// Admin dashboard routes - load on demand
const AdminDashboard = lazy(() => import('./dashboard/page'));
const AdminPlugins = lazy(() => import('./plugins/page'));
const AdminSettings = lazy(() => import('./settings/page'));
```

### 3.2 Bundle Analysis & Optimization

**Analyze Bundle Size**:

```bash
# Add bundle analyzer
npm install --save-dev @next/bundle-analyzer cross-env

# Update package.json
{
  "scripts": {
    "analyze": "cross-env ANALYZE=true next build"
  }
}

# Run analysis
npm run analyze
```

**Reduce Bundle Size**:

```typescript
// Tree-shake Lodash - import only what you need
// BEFORE:
import _ from 'lodash';
const result = _.map(data, fn);

// AFTER:
import map from 'lodash/map';
const result = map(data, fn);

// Or use lodash-es for better tree-shaking
import { map, filter, reduce } from 'lodash-es';

// Use date-fns instead of moment.js (smaller)
// BEFORE:
import moment from 'moment';

// AFTER:
import { format, addDays } from 'date-fns';

// Dynamic import for chart libraries
const HeavyChart = dynamic(() => import('recharts').then(mod => mod.LineChart), {
  ssr: false,
  loading: () => <ChartSkeleton />
});
```

### 3.3 Image Optimization

**Next.js Image Component** (`src/components/PropertyCard.tsx`):

```typescript
import Image from 'next/image';

export function PropertyCard({ property }) {
  return (
    <div className="property-card">
      <Image
        src={property.imageUrl}
        alt={property.name}
        width={400}
        height={300}
        placeholder="blur"
        blurDataURL={property.thumbnailUrl} // Low-res placeholder
        loading="lazy" // Lazy load below fold
        quality={75} // Compress to 75%
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
}
```

**Enable Image Optimization in next.config.js**:

```javascript
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.sinaicamps.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
  },
};
```

### 3.4 Font Optimization

```typescript
// src/app/layout.tsx
import { Inter } from 'next/font/google';

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Use swap to prevent FOIT
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

---

## Phase 4: Infrastructure & Edge Caching (Priority: MEDIUM)

**Agents**: @devops

### 4.1 Nginx Caching Configuration

**Update nginx-unified.conf**:

```nginx
# Proxy cache settings
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:100m max_size=1g inactive=60m use_temp_path=off;
proxy_cache_key "$scheme$request_method$host$request_uri$cookie_session";

# Cache static assets aggressively
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    add_header Vary "Accept-Encoding";
    access_log off;
}

# Cache public API endpoints
location /api/public/ {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_cache_valid 404 1m;
    proxy_cache_use_stale error timeout updating http_500 http_502 http_503 http_504;
    proxy_cache_background_update on;
    proxy_cache_lock on;
    
    add_header X-Cache-Status $upstream_cache_status;
    
    proxy_pass http://localhost:3001;
}

# Cache tenant resolution (changes infrequently)
location /api/tenant/resolve {
    proxy_cache api_cache;
    proxy_cache_valid 200 2m;
    proxy_cache_valid 404 30s;
    
    add_header X-Cache-Status $upstream_cache_status;
    
    proxy_pass http://localhost:3001;
}

# Don't cache authenticated endpoints
location /api/manage/ {
    proxy_cache_bypass $http_cache_control;
    proxy_no_cache $cookie_session;
    
    proxy_pass http://localhost:3001;
}
```

### 4.2 CDN Configuration (Cloudflare)

**Page Rules**:
```
1. /_next/static/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month

2. /api/public/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 5 minutes
   - Browser Cache TTL: 5 minutes

3. /images/*
   - Cache Level: Cache Everything
   - Edge Cache TTL: 1 month
   - Browser Cache TTL: 1 month
```

### 4.3 Gzip/Brotli Compression

**nginx configuration**:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types
    text/plain
    text/css
    text/xml
    application/json
    application/javascript
    application/rss+xml
    application/atom+xml
    image/svg+xml;

# Brotli compression (if module available)
brotli on;
brotli_comp_level 6;
brotli_types
    text/plain
    text/css
    text/xml
    application/json
    application/javascript;
```

---

## Phase 5: Monitoring & Measurement (Priority: HIGH)

**Agents**: @backend_architect + @qa

### 5.1 Performance Metrics Collection

**Add to middleware** (`src/middleware.ts`):

```typescript
export async function middleware(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();
  
  const res = await handleMiddleware(req);
  
  const duration = Date.now() - startTime;
  
  // Log slow requests
  if (duration > 500) {
    logger.warn(`Slow request: ${req.method} ${req.nextUrl.pathname} took ${duration}ms`);
  }
  
  // Add timing headers
  res.headers.set('X-Response-Time', `${duration}ms`);
  res.headers.set('X-Request-Id', requestId);
  
  return res;
}
```

**Database Query Timing** (`src/lib/db.ts`):

```typescript
export async function timedQuery<T>(
  name: string,
  sql: string,
  params?: any[]
): Promise<T> {
  const start = performance.now();
  const result = await db.query(sql, params);
  const duration = performance.now() - start;
  
  // Log slow queries
  if (duration > 100) {
    logger.warn(`Slow query [${name}]: ${duration.toFixed(2)}ms - ${sql.substring(0, 100)}`);
  }
  
  // Send to metrics
  recordHistogram('db_query_duration_ms', duration);
  
  return result;
}
```

### 5.2 Create Performance Dashboard

**API Endpoint** (`src/app/api/admin/performance/route.ts`):

```typescript
export async function GET() {
  const stats = {
    cache: getCacheStats(),
    database: {
      // Query counts, avg duration
    },
    api: {
      // Response times by endpoint
    },
    bundle: {
      // Size analytics
    },
  };
  
  return Response.json(stats);
}
```

### 5.3 Load Testing

**Script** (`scripts/load-test.js`):

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up
    { duration: '3m', target: 100 },  // Steady state
    { duration: '1m', target: 200 },  // Spike
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% under 200ms
    http_req_failed: ['rate<0.01'],   // <1% errors
  },
};

export default function () {
  // Test homepage
  const res = http.get('https://sinaicamps.com/en');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  // Test API
  const apiRes = http.get('https://sinaicamps.com/api/public/tenant-listing');
  check(apiRes, {
    'api status is 200': (r) => r.status === 200,
    'api response time < 200ms': (r) => r.timings.duration < 200,
  });
  
  sleep(1);
}
```

Run: `k6 run scripts/load-test.js`

---

## Verification Checklist

### After Database Optimization:
- [ ] All new indexes created successfully
- [ ] `EXPLAIN QUERY PLAN` shows "USING INDEX" not "SCAN"
- [ ] Query execution time < 50ms for common queries
- [ ] No N+1 queries in booking/housekeeping flows

### After Caching Implementation:
- [ ] Cache hit rate > 80% for public endpoints
- [ ] Availability endpoint responds < 100ms (cached)
- [ ] Cache invalidation works on booking changes
- [ ] Memory usage stable (no memory leaks)

### After Frontend Optimization:
- [ ] Initial bundle size < 200KB
- [ ] First Contentful Paint < 1.5s
- [ ] Lazy loaded chunks work correctly
- [ ] Images served in WebP/AVIF format
- [ ] Lighthouse score > 90

### After Infrastructure:
- [ ] Static assets cached for 1 year
- [ ] API responses cached appropriately
- [ ] Gzip/Brotli compression enabled
- [ ] CDN cache hit rate > 80%

### Load Testing Results:
- [ ] 100 concurrent users: p95 < 200ms
- [ ] 200 concurrent users: p95 < 500ms
- [ ] Error rate < 1%
- [ ] No memory leaks over 5min test

---

## Execution Order

**Day 1**: Database indexes + query optimization  
**Day 2**: API caching layer + cache integration  
**Day 3**: Frontend code splitting + bundle optimization  
**Day 4**: Infrastructure (nginx/CDN) + image optimization  
**Day 5**: Monitoring + load testing + final verification

---

## Success Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| API p95 response | ~200-500ms | < 100ms | ⬜ |
| DB query time | ~100-300ms | < 50ms | ⬜ |
| FCP (First Contentful Paint) | ~2-3s | < 1.5s | ⬜ |
| Bundle size | ~350KB+ | < 200KB | ⬜ |
| Cache hit rate | N/A | > 80% | ⬜ |
| Lighthouse score | ~70-80 | > 90 | ⬜ |

**Execute all phases. Measure before and after. Report metrics.**
