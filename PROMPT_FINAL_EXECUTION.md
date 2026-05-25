# OpenCode Final Execution Prompt: Documentation Site + Redis + Plugin Indexes + Deployment

## Executive Summary

**Current State**: Production-ready plugins, performance optimized, core docs complete  
**Remaining Work**: 4 Critical Components  
**Timeline**: 7-10 days to full production launch  
**Goal**: Complete documentation system, distributed caching, plugin optimizations, production deployment

---

## Component 1: Interactive Documentation Site (Priority: HIGH)

**Agent**: @frontend_marketplace + @tech_writer  
**Timeline**: 3-4 days  
**Location**: `/src/app/docs/` + `/docs/` (content)

### 1.1 Site Architecture

```
src/app/docs/
├── layout.tsx                 # Docs layout with sidebar
├── page.tsx                   # Docs homepage
├── [[...slug]]/page.tsx       # Dynamic MDX rendering
├── api/
│   ├── search/route.ts        # Search API endpoint
│   └── playground/route.ts    # API playground proxy
└── _components/
    ├── DocsSidebar.tsx        # Navigation sidebar
    ├── DocsHeader.tsx         # Top bar with search
    ├── DocSearch.tsx          # Client search
    ├── ApiPlayground.tsx      # Interactive API tester
    ├── CodeBlock.tsx          # Multi-language code
    ├── MdxRenderer.tsx        # MDX content renderer
    ├── PluginHub.tsx          # Plugin docs index
    └── ThemeToggle.tsx        # Dark/light mode
```

### 1.2 Implementation

**Layout** (`src/app/docs/layout.tsx`):

```typescript
import { DocSidebar } from './_components/DocsSidebar';
import { DocHeader } from './_components/DocsHeader';
import { getAllDocs } from '@/lib/docs';

export default async function DocsLayout({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  const allDocs = await getAllDocs(); // Index all docs
  
  return (
    <div className="docs-layout min-h-screen bg-white dark:bg-gray-900">
      <DocHeader docs={allDocs} />
      <div className="flex pt-16">
        <aside className="w-64 fixed h-[calc(100vh-4rem)] overflow-y-auto border-r dark:border-gray-800">
          <DocSidebar docs={allDocs} />
        </aside>
        <main className="flex-1 ml-64 p-8 max-w-4xl">
          {children}
        </main>
        <aside className="w-64 hidden xl:block fixed right-0 h-[calc(100vh-4rem)] overflow-y-auto">
          <TableOfContents />
        </aside>
      </div>
    </div>
  );
}
```

**Dynamic Page Rendering** (`src/app/docs/[[...slug]]/page.tsx`):

```typescript
import { notFound } from 'next/navigation';
import { compileMDX } from 'next-mdx-remote/rsc';
import { readFile } from 'fs/promises';
import path from 'path';
import { CodeBlock } from '../_components/CodeBlock';
import { ApiPlayground } from '../_components/ApiPlayground';
import { Callout } from '../_components/Callout';

const components = {
  CodeBlock,
  ApiPlayground,
  Callout,
  // ... other MDX components
};

export async function generateStaticParams() {
  // Generate all doc paths
  const docs = await getAllDocPaths();
  return docs.map((doc) => ({ slug: doc.slug.split('/') }));
}

export default async function DocPage({ 
  params 
}: { 
  params: { slug?: string[] } 
}) {
  const slugPath = params.slug?.join('/') || 'index';
  const docPath = path.join(process.cwd(), 'docs', `${slugPath}.md`);
  
  try {
    const content = await readFile(docPath, 'utf-8');
    const { content: mdxContent, frontmatter } = await compileMDX({
      source: content,
      components,
      options: {
        parseFrontmatter: true,
      }
    });
    
    return (
      <article className="prose dark:prose-invert max-w-none">
        <h1>{frontmatter.title}</h1>
        {frontmatter.description && (
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {frontmatter.description}
          </p>
        )}
        {mdxContent}
      </article>
    );
  } catch {
    notFound();
  }
}
```

**Search Implementation** (`src/lib/docs-search.ts`):

```typescript
import lunr from 'lunr';
import { glob } from 'glob';
import matter from 'gray-matter';
import { readFile } from 'fs/promises';

let searchIndex: lunr.Index | null = null;
let documents: Map<string, any> = new Map();

export async function buildSearchIndex() {
  const docFiles = await glob('docs/**/*.md');
  const docs = await Promise.all(
    docFiles.map(async (file) => {
      const content = await readFile(file, 'utf-8');
      const { data, content: body } = matter(content);
      const slug = file.replace('docs/', '').replace('.md', '');
      
      return {
        id: slug,
        title: data.title || slug,
        content: body.slice(0, 5000), // Limit content size
        category: slug.split('/')[0],
      };
    })
  );
  
  // Build Lunr index
  searchIndex = lunr(function() {
    this.ref('id');
    this.field('title', { boost: 10 });
    this.field('content');
    this.field('category');
    
    docs.forEach((doc) => {
      documents.set(doc.id, doc);
      this.add(doc);
    });
  });
  
  return searchIndex;
}

export async function searchDocs(query: string): Promise<any[]> {
  if (!searchIndex) {
    await buildSearchIndex();
  }
  
  const results = searchIndex!.search(query);
  return results.map((result) => ({
    ...documents.get(result.ref),
    score: result.score,
  }));
}
```

**API Playground Component** (`src/app/docs/_components/ApiPlayground.tsx`):

```typescript
'use client';

import { useState } from 'react';

interface Endpoint {
  path: string;
  methods: string[];
  description: string;
  parameters?: any[];
  exampleRequest?: any;
  exampleResponse?: any;
}

export function ApiPlayground({ endpoint }: { endpoint: Endpoint }) {
  const [method, setMethod] = useState(endpoint.methods[0] || 'GET');
  const [path, setPath] = useState(endpoint.path);
  const [body, setBody] = useState(
    JSON.stringify(endpoint.exampleRequest || {}, null, 2)
  );
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [headers, setHeaders] = useState({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN_HERE',
  });
  
  async function sendRequest() {
    setLoading(true);
    setResponse('');
    
    try {
      const res = await fetch('/api/docs/playground', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method,
          path,
          headers,
          body: method !== 'GET' ? JSON.parse(body) : undefined,
        }),
      });
      
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(JSON.stringify({ error: String(error) }, null, 2));
    } finally {
      setLoading(false);
    }
  }
  
  return (
    <div className="border rounded-lg overflow-hidden my-6 bg-gray-50 dark:bg-gray-800">
      <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b flex items-center gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-2 py-1 rounded border text-sm font-mono bg-white"
        >
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input
          type="text"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          className="flex-1 px-2 py-1 rounded border text-sm font-mono"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-4 border-r">
          <label className="text-xs font-semibold uppercase text-gray-500">
            Request Body
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={method === 'GET'}
            className="w-full h-48 mt-2 p-2 text-sm font-mono bg-white border rounded resize-none"
          />
        </div>
        
        <div className="p-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase text-gray-500">
              Response
            </label>
            <button
              onClick={sendRequest}
              disabled={loading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
          <pre className="w-full h-48 mt-2 p-2 text-sm font-mono bg-white border rounded overflow-auto">
            {response || '// Click "Send Request" to see response'}
          </pre>
        </div>
      </div>
    </div>
  );
}
```

**Plugin Hub Component** (`src/app/docs/_components/PluginHub.tsx`):

```typescript
import Link from 'next/link';
import { getAllPlugins } from '@/lib/plugins';

export async function PluginHub() {
  const plugins = await getAllPlugins();
  
  return (
    <div className="plugin-hub">
      <h1 className="text-3xl font-bold mb-4">Plugin Documentation Hub</h1>
      <p className="text-gray-600 mb-8">
        All 24 SinaiCamps plugins documented in one place.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map((plugin) => (
          <Link
            key={plugin.id}
            href={`/docs/plugins/${plugin.id}`}
            className="block p-6 border rounded-lg hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{plugin.icon}</span>
              <h3 className="font-semibold">{plugin.name}</h3>
            </div>
            <p className="text-sm text-gray-600">{plugin.description}</p>
            <div className="mt-4 flex gap-2">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                {plugin.category}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                {plugin.plan}
              </span>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="mt-12 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Need Help?</h2>
        <ul className="list-disc list-inside space-y-1 text-gray-600">
          <li>Can't find a plugin? Check if it's enabled in your tenant settings.</li>
          <li>Plugin not working? See the troubleshooting section in the plugin docs.</li>
          <li>Need custom integration? Contact support@sinaicamps.com</li>
        </ul>
      </div>
    </div>
  );
}
```

### 1.3 Dependencies to Install

```bash
npm install @next/mdx next-mdx-remote gray-matter lunr
npm install @types/lunr --save-dev
```

**Update next.config.mjs**:

```javascript
import createMDX from '@next/mdx';

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
  // ... existing config
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  }
});

export default withMDX(nextConfig);
```

### 1.4 Verification

- [ ] Docs site accessible at `/docs`
- [ ] All MDX files render correctly
- [ ] Search returns results from all docs
- [ ] API playground can send test requests
- [ ] Plugin hub shows all 24 plugins
- [ ] Dark mode toggle works
- [ ] Mobile responsive
- [ ] Table of contents auto-generated
- [ ] No broken links

---

## Component 2: Redis Distributed Cache (Priority: HIGH)

**Agent**: @backend_architect  
**Timeline**: 1 day  
**Dependencies**: ioredis (already installed)

### 2.1 Redis Cache Implementation

**File**: `src/lib/redis-cache.ts`

```typescript
import Redis from 'ioredis';
import { logger } from './logger';

// Redis client singleton
let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null;
  }
  
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis connection error:', err);
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });
  }
  
  return redisClient;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) return null;
  
  try {
    const value = await client.get(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch (error) {
    logger.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
}

export async function redisSet<T>(
  key: string, 
  value: T, 
  ttlSeconds: number
): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    const serialized = JSON.stringify(value);
    await client.setex(key, ttlSeconds, serialized);
  } catch (error) {
    logger.error(`Redis SET error for key ${key}:`, error);
  }
}

export async function redisDelete(key: string): Promise<void> {
  const client = getRedisClient();
  if (!client) return;
  
  try {
    await client.del(key);
  } catch (error) {
    logger.error(`Redis DELETE error for key ${key}:`, error);
  }
}

export async function redisDeletePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return 0;
  
  try {
    const keys = await client.keys(pattern);
    if (keys.length === 0) return 0;
    
    await client.del(...keys);
    logger.info(`Redis deleted ${keys.length} keys matching ${pattern}`);
    return keys.length;
  } catch (error) {
    logger.error(`Redis pattern delete error for ${pattern}:`, error);
    return 0;
  }
}

export async function redisExists(key: string): Promise<boolean> {
  const client = getRedisClient();
  if (!client) return false;
  
  try {
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    logger.error(`Redis EXISTS error for key ${key}:`, error);
    return false;
  }
}

export async function redisTTL(key: string): Promise<number> {
  const client = getRedisClient();
  if (!client) return -2;
  
  try {
    return await client.ttl(key);
  } catch (error) {
    logger.error(`Redis TTL error for key ${key}:`, error);
    return -2;
  }
}

// Multi-get for batch operations
export async function redisMGet<T>(keys: string[]): Promise<(T | null)[]> {
  const client = getRedisClient();
  if (!client) return keys.map(() => null);
  
  try {
    const values = await client.mget(keys);
    return values.map((v) => (v ? JSON.parse(v) : null));
  } catch (error) {
    logger.error('Redis MGET error:', error);
    return keys.map(() => null);
  }
}

// Health check
export async function redisHealthCheck(): Promise<{ status: string; latency: number }> {
  const client = getRedisClient();
  if (!client) {
    return { status: 'not_configured', latency: 0 };
  }
  
  const start = Date.now();
  try {
    await client.ping();
    return { status: 'healthy', latency: Date.now() - start };
  } catch (error) {
    return { status: 'unhealthy', latency: Date.now() - start };
  }
}
```

### 2.2 Enhanced Cache Layer

**Update** `src/lib/cache.ts` to support Redis fallback:

```typescript
import NodeCache from 'node-cache';
import { 
  redisGet, 
  redisSet, 
  redisDelete, 
  redisDeletePattern,
  getRedisClient 
} from './redis-cache';
import { logger } from './logger';

// Determine if Redis is available
const useRedis = !!getRedisClient();

// Local cache for when Redis is unavailable or for short TTL items
const localCache = new NodeCache({ 
  stdTTL: 300, 
  checkperiod: 60,
  useClones: false 
});

interface CacheOptions {
  ttl: number;           // TTL in seconds
  useRedis?: boolean;    // Force Redis even for short TTL
  tags?: string[];       // Cache tags for invalidation
}

export async function cachedQuery<T>(
  key: string,
  options: CacheOptions,
  fn: () => Promise<T>
): Promise<T> {
  const { ttl, useRedis: forceRedis = false, tags = [] } = options;
  
  // Try Redis first (if available and appropriate)
  if (useRedis && (forceRedis || ttl > 60)) {
    const cached = await redisGet<T>(key);
    if (cached !== null) {
      logger.debug(`Redis cache hit: ${key}`);
      return cached;
    }
  }
  
  // Fall back to local cache
  const localCached = localCache.get<T>(key);
  if (localCached !== undefined) {
    logger.debug(`Local cache hit: ${key}`);
    return localCached;
  }
  
  // Execute function
  logger.debug(`Cache miss: ${key}`);
  const result = await fn();
  
  // Store in both caches
  if (useRedis && (forceRedis || ttl > 60)) {
    await redisSet(key, result, ttl);
  }
  localCache.set(key, result, ttl);
  
  // Store tag mappings for invalidation
  if (tags.length > 0) {
    for (const tag of tags) {
      const tagKey = `_tag:${tag}`;
      const existing = localCache.get<string[]>(tagKey) || [];
      if (!existing.includes(key)) {
        localCache.set(tagKey, [...existing, key], ttl * 2);
      }
    }
  }
  
  return result;
}

export async function invalidateCache(
  pattern?: string, 
  tags?: string[]
): Promise<void> {
  // Invalidate by pattern
  if (pattern) {
    // Redis pattern delete
    if (useRedis) {
      await redisDeletePattern(pattern);
    }
    
    // Local cache pattern delete
    const localKeys = localCache.keys().filter(k => k.includes(pattern));
    localCache.del(localKeys);
    
    logger.info(`Invalidated cache pattern: ${pattern} (${localKeys.length} local keys)`);
  }
  
  // Invalidate by tags
  if (tags) {
    for (const tag of tags) {
      const tagKey = `_tag:${tag}`;
      const keys = localCache.get<string[]>(tagKey) || [];
      
      if (useRedis) {
        for (const key of keys) {
          await redisDelete(key);
        }
      }
      
      localCache.del(keys);
      localCache.del(tagKey);
      
      logger.info(`Invalidated tag ${tag}: ${keys.length} keys`);
    }
  }
}

export function getCacheStats() {
  return {
    local: {
      keys: localCache.keys().length,
      stats: localCache.getStats(),
    },
    redis: {
      available: useRedis,
    }
  };
}

// Health check endpoint
export async function cacheHealthCheck() {
  const localStats = localCache.getStats();
  const redisHealth = await import('./redis-cache').then(m => m.redisHealthCheck());
  
  return {
    local: {
      status: 'healthy',
      keys: localCache.keys().length,
      hits: localStats.hits,
      misses: localStats.misses,
      hitRate: localStats.hits / (localStats.hits + localStats.misses),
    },
    redis: await redisHealth,
  };
}
```

### 2.3 Integration with Existing Cache Usage

Update existing cached queries to use new system:

```typescript
// Example: Tenant resolution (already exists, update to use tags)
const tenant = await cachedQuery(
  `tenant:${hostname}`,
  { ttl: 60, tags: ['tenant'] },
  async () => {
    const res = await fetch(`${API_URL}/api/tenant/resolve?host=${hostname}`);
    return res.json();
  }
);

// Example: Availability (already exists, update with proper invalidation)
const result = await cachedQuery(
  `availability:${listingId}:${checkIn}:${checkOut}`,
  { ttl: 60, tags: ['availability', `listing:${listingId}`] },
  async () => roomService.checkAvailability(validated)
);

// Invalidate on booking
await invalidateCache(undefined, ['availability', `listing:${listingId}`]);
```

### 2.4 Environment Configuration

Add to `.env`:

```bash
# Redis Configuration (optional, falls back to memory cache if not set)
REDIS_URL=redis://localhost:6379
# OR for production with auth:
# REDIS_URL=redis://username:password@redis-host:6379/0
```

### 2.5 Health Check Endpoint

**Add to** `src/app/api/health/cache/route.ts`:

```typescript
import { cacheHealthCheck } from '@/lib/cache';

export async function GET() {
  const health = await cacheHealthCheck();
  return Response.json(health);
}
```

### 2.6 Verification

- [ ] Redis connects when REDIS_URL is set
- [ ] Falls back to memory cache when Redis unavailable
- [ ] Cache invalidation works with tags
- [ ] Pattern-based deletion works
- [ ] Health check endpoint returns status
- [ ] Long TTL items go to Redis, short TTL to memory
- [ ] No memory leaks over time

---

## Component 3: Plugin-Specific Database Indexes (Priority: MEDIUM)

**Agents**: @db_architect + @backend_architect  
**Timeline**: 1-2 days (batch update all 24 plugins)  
**Location**: Each plugin's `src/index.ts` init() function

### 3.1 Index Strategy

**Rule**: Each plugin creates its own indexes in `init()` using `api.db.execute()`  
**Pattern**: `CREATE INDEX IF NOT EXISTS` to be idempotent  
**Location**: After table creation, before data seeding

### 3.2 Plugin Index Assignments

**Critical Plugins** (HIGH priority):

#### Booking Plugin (`plugins/booking/src/index.ts`):
```typescript
// After table creation, add:
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_bookings_listing_checkin 
  ON plugin_booking_bookings(listing_id, check_in)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_bookings_listing_status 
  ON plugin_booking_bookings(listing_id, status)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_bookings_guest_email 
  ON plugin_booking_bookings(guest_email)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_bookings_dates 
  ON plugin_booking_bookings(check_in, check_out)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_availability_room_date 
  ON plugin_booking_room_availability(room_id, date)
`);
```

#### Housekeeping Plugin (`plugins/housekeeping/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_housekeeping_room_status 
  ON plugin_housekeeping_tasks(room_id, status)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_housekeeping_assigned 
  ON plugin_housekeeping_tasks(assigned_to, status)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_housekeeping_status_priority 
  ON plugin_housekeeping_tasks(status, priority, created_at DESC)
`);
```

#### POS Plugin (`plugins/pos-kds/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_pos_orders_status_date 
  ON plugin_pos_orders(status, created_at DESC)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_pos_order_items_order 
  ON plugin_pos_order_items(order_id)
`);
```

#### Maintenance Plugin (`plugins/maintenance/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_maintenance_status_priority 
  ON plugin_maintenance_requests(status, priority, created_at DESC)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_maintenance_assigned 
  ON plugin_maintenance_requests(assigned_to, status)
`);
```

**Operations Plugins** (MEDIUM priority):

#### Staff Roster (`plugins/staff-roster/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_staff_shifts_employee 
  ON staff_shifts(user_id, shift_start)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_staff_shifts_dates 
  ON staff_shifts(shift_start, shift_end)
`);
```

#### Inventory-Waste (`plugins/inventory-waste/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item 
  ON plugin_inventory_transactions(item_id, created_at DESC)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_inventory_low_stock 
  ON plugin_inventory_stock(quantity_available) 
  WHERE quantity_available <= 10
`);
```

#### Loyalty (`plugins/loyalty/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_loyalty_points_guest 
  ON plugin_loyalty_points(guest_id)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_guest 
  ON plugin_loyalty_redemptions(guest_id, created_at DESC)
`);
```

**Integration Plugins** (MEDIUM priority):

#### OTA Channel Manager (`plugins/ota-channel-manager/src/index.ts`):
```typescript
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_ota_channels_property 
  ON plugin_ota_channels(property_id, is_active)
`);
await api.db.execute(`
  CREATE INDEX IF NOT EXISTS idx_ota_reservations_channel 
  ON plugin_ota_reservations(channel_id, imported_at DESC)
`);
```

### 3.3 Complete Plugin Index List

**Batch update all 24 plugins with these indexes**:

| Plugin | Indexes |
|--------|---------|
| booking | 5 indexes (bookings, availability) |
| housekeeping | 3 indexes (tasks, assignments) |
| maintenance | 2 indexes (requests, assignments) |
| pos-kds | 2 indexes (orders, items) |
| inventory-waste | 2 indexes (transactions, low stock) |
| staff-roster | 2 indexes (shifts, dates) |
| loyalty | 2 indexes (points, redemptions) |
| crm | 2 indexes (activities, guest history) |
| guest-crm | 1 index (segments) |
| ota-channel-manager | 2 indexes (channels, reservations) |
| ical | 1 index (calendar syncs) |
| financial-ops | 2 indexes (folios, charges) |
| accounting | 2 indexes (ledger, invoices) |
| hr-core | 2 indexes (employees, leave) |
| marketing-automation | 2 indexes (campaigns, triggers) |
| subscriptions | 2 indexes (subscriptions, invoices) |
| activities | 1 index (bookings) |
| integrations | 1 index (external calendars) |
| siteminder | 1 index (channel mappings) |
| paymob | 1 index (transactions) |
| pwa | 0 (no DB tables) |
| resource | 1 index (resources) |
| listing-admin | 1 index (listings) |
| owner | 1 index (owner data) |

### 3.4 Verification

- [ ] All 24 plugins have indexes in init()
- [ ] Indexes use `IF NOT EXISTS` (idempotent)
- [ ] `EXPLAIN QUERY PLAN` shows "USING INDEX" for common queries
- [ ] Query execution time < 50ms for plugin queries
- [ ] No duplicate indexes with core migration 013

---

## Component 4: Final Integration & Production Deployment (Priority: CRITICAL)

**Agents**: @devops + @backend_architect + @frontend_marketplace  
**Timeline**: 2-3 days  
**Goal**: Production-ready deployment with all components integrated

### 4.1 Pre-Production Checklist

**Code Quality**:
- [ ] All 128 tests passing
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] No lint errors (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Bundle size < 300KB initial JS

**Documentation**:
- [ ] Interactive docs site builds successfully
- [ ] All plugin docs created (24/24)
- [ ] Search indexing works
- [ ] API playground tested
- [ ] No broken internal links

**Performance**:
- [ ] Database indexes applied (core + all plugins)
- [ ] Redis cache working (if configured)
- [ ] Memory cache fallback working
- [ ] API response times < 100ms (p95)
- [ ] Lighthouse score > 90

**Infrastructure**:
- [ ] Nginx config tested
- [ ] SSL certificates valid
- [ ] Environment variables configured
- [ ] Database backups configured
- [ ] Monitoring alerts set up

### 4.2 Production Environment Setup

**Environment Variables** (`.env.production`):

```bash
# App
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://sinaicamps.com
NEXT_PUBLIC_API_URL=https://sinaicamps.com/api
PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@prod-db:5432/sinaicamps

# Auth
AUTH_SECRET=YOUR_GENERATED_SECRET_HERE

# Redis (optional but recommended)
REDIS_URL=redis://prod-redis:6379

# External Services
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG....

# Monitoring
SENTRY_DSN=https://...
LOG_LEVEL=warn

# Feature Flags
ENABLE_ANALYTICS=true
ENABLE_CACHE=true
```

### 4.3 Deployment Script

**File**: `scripts/deploy-production.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# 1. Pre-deployment checks
echo "📋 Running pre-deployment checks..."
npm ci
npm run typecheck
npm run lint
npm run test
npm run build

# 2. Database migrations
echo "🗄️ Running database migrations..."
npm run db:migrate

# 3. Build and push Docker image (if using Docker)
# docker build -t sinaicamps:latest .
# docker push sinaicamps:latest

# 4. Deploy to server
echo "📤 Deploying to production..."
rsync -avz --exclude='node_modules' --exclude='.git' \
  ./dist/ user@production-server:/var/www/sinaicamps/

# 5. Restart services
ssh user@production-server << 'EOF'
  cd /var/www/sinaicamps
  npm install --production
  pm2 reload ecosystem.config.js --env production
EOF

# 6. Post-deployment verification
echo "✅ Verifying deployment..."
sleep 5
curl -f https://sinaicamps.com/api/health || exit 1
curl -f https://sinaicamps.com/api/health/db || exit 1

echo "🎉 Deployment successful!"
```

### 4.4 Post-Deployment Verification

**Smoke Tests**:
```bash
# Health checks
curl https://sinaicamps.com/api/health
curl https://sinaicamps.com/api/health/db
curl https://sinaicamps.com/api/health/cache

# Key functionality
curl -X POST https://sinaicamps.com/api/public/tenant/resolve?host=test.sinaicamps.com
curl https://sinaicamps.com/api/p/booking/check-availability \
  -H "Content-Type: application/json" \
  -d '{"listingId":"1","checkIn":"2024-06-01","checkOut":"2024-06-02"}'

# Documentation site
curl https://sinaicamps.com/docs
curl https://sinaicamps.com/docs/plugins
```

**Load Test**:
```bash
# Run k6 load test
k6 run scripts/load-test.js
```

**Monitoring Dashboard**:
- Check error rates (should be < 1%)
- Verify response times (p95 < 200ms)
- Monitor cache hit rates (> 80%)
- Check database connection pool

### 4.5 Rollback Plan

**If deployment fails**:
```bash
# Rollback to previous version
ssh user@production-server << 'EOF'
  cd /var/www/sinaicamps
  git checkout previous-stable-tag
  npm install --production
  pm2 reload ecosystem.config.js
EOF
```

**Database rollback**:
```bash
# Rollback migrations if needed
npm run db:migrate:rollback
```

### 4.6 Launch Announcement Checklist

**Internal**:
- [ ] Notify team of production launch
- [ ] Update deployment runbook
- [ ] Schedule post-launch review

**External**:
- [ ] Update status page
- [ ] Announce on social media (if major release)
- [ ] Update documentation site with latest changes

---

## Complete Execution Timeline

### Days 1-2: Redis + Plugin Indexes (Parallel)
- **@backend_architect**: Redis cache implementation
- **@db_architect + @backend_architect**: Batch update all 24 plugins with indexes
- **Verification**: Test Redis connection, verify indexes with EXPLAIN QUERY PLAN

### Days 3-5: Interactive Documentation Site
- **@frontend_marketplace**: Build docs site components
- **@tech_writer**: Review and finalize all plugin docs
- **Integration**: Connect search, API playground, plugin hub
- **Verification**: Test all features, mobile responsive, dark mode

### Days 6-7: Plugin Documentation (Parallel with site)
- **All plugin agents**: Create plugin docs (3-4 files each)
- **@tech_writer**: Review for consistency
- **Goal**: All 24 plugins documented in `/docs/plugins/`

### Days 8-9: Integration & Testing
- **All agents**: Full system integration
- **Testing**: End-to-end tests, load tests, security audit
- **Bug fixes**: Address any issues found
- **Performance tuning**: Optimize based on metrics

### Day 10: Production Deployment
- **@devops**: Production deployment
- **@backend_architect**: Post-deployment monitoring
- **@frontend_marketplace**: Docs site launch
- **All**: Victory celebration! 🎉

---

## Success Criteria

| Component | Target | Verification |
|-----------|--------|------------|
| **Docs Site** | Live at `/docs` | ✅ Accessible, searchable, interactive |
| **Plugin Docs** | 24/24 complete | ✅ All plugins have README + api + config |
| **Redis Cache** | Working in prod | ✅ Response times < 100ms with cache |
| **Plugin Indexes** | All 24 plugins | ✅ Query plans show "USING INDEX" |
| **Production** | Deployed | ✅ Zero-downtime deployment |
| **Tests** | All passing | ✅ 128/128 tests, 0 failures |
| **Monitoring** | Active | ✅ Alerts configured, dashboards live |

---

## Agent Assignments Summary

### Component 1: Interactive Docs Site
- **@frontend_marketplace**: Site architecture, components, MDX rendering
- **@tech_writer**: Content review, navigation structure
- **@ux_designer**: Design review, mobile experience

### Component 2: Redis Cache
- **@backend_architect**: Implementation, integration with existing cache

### Component 3: Plugin Indexes
- **@db_architect**: Index strategy, performance validation
- **@backend_architect**: Batch updates to all 24 plugins

### Component 4: Production Deployment
- **@devops**: Deployment scripts, infrastructure, monitoring
- **@backend_architect**: Health checks, post-deployment verification
- **@frontend_marketplace**: Docs site launch verification
- **@qa**: Final testing, load tests

### Plugin Documentation (Parallel)
- **@plugin_booking**: Booking plugin docs
- **@plugin_operations**: 10 operations plugins
- **@plugin_crm**: 4 CRM/loyalty plugins
- **@plugin_integrations**: 5 integration plugins
- **@plugin_payments**: Paymob plugin
- **@frontend_marketplace**: PWA plugin
- **@backend_architect**: 3 core plugins
- **@tech_writer**: Consistency review across all

---

## Final Deliverables

1. ✅ Interactive documentation site at `/docs`
2. ✅ Redis distributed cache layer
3. ✅ 24 plugins with optimized database indexes
4. ✅ Complete plugin documentation hub
5. ✅ Production deployment live
6. ✅ Monitoring and alerting active
7. ✅ 128 tests passing, 0 failures

**Execute all components. Deliver fully production-ready SinaiCamps marketplace.** 🚀
