import { drizzle as drizzleSqlite, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '@/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { logger } from './logger';
import { runMigrations } from './runMigrations';
import './bootstrap';

// Environment-aware DB initialisation
const isTest = process.env.NODE_ENV === 'test';
const dbFile = process.env.DATABASE_URL?.startsWith('file:')
  ? process.env.DATABASE_URL.replace('file:', '')
  : isTest
    ? ':memory:'
    : 'sinaicamps.db';

export let drizzle: any;
let sqliteDb: Database.Database | null = null;
let pgPool: any = null;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  logger.info(`Using PostgreSQL database from DATABASE_URL`);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { drizzle: drizzlePg } = require('drizzle-orm/node-postgres');

  pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Add SSL for production if needed
    ...(process.env.NODE_ENV === 'production' && { ssl: { rejectUnauthorized: false } }),
  });
  drizzle = drizzlePg(pgPool, { schema });
} else {
  logger.info(`Using SQLite database: ${dbFile} (NODE_ENV=${process.env.NODE_ENV})`);
  sqliteDb = new Database(dbFile);
  getSqlite().pragma('journal_mode = WAL');
  const journalMode = getSqlite().pragma('journal_mode');
  logger.info(`SQLite journal_mode: ${JSON.stringify(journalMode)}`);
  getSqlite().pragma('busy_timeout = 10000');
  getSqlite().pragma('synchronous = NORMAL');
  drizzle = drizzleSqlite(getSqlite(), { schema });
  if (dbFile !== ':memory:') {
    runMigrations(getSqlite());
  }
}

let isSeeded = false;

const defaultPluginDefs = [
  {
    name: 'booking',
    displayName: 'Marketplace Booking',
    category: 'commerce',
    manifest: JSON.stringify({
      slots: {
        'public.booking': ['booking:PublicBookingWidget'],
        'manager.bookings': ['booking:ManagerBookingsList'],
        'owner.bookings': ['booking:ManagerBookingsList'],
        'staff.checkins': ['booking:StaffCheckInPanel'],
        'guest.dashboard': ['booking:GuestReservationsList'],
        'guest.reservations': ['booking:GuestReservationsList'],
      },
    }),
  },
  {
    name: 'crm',
    displayName: 'Customer Relations',
    category: 'marketing',
    manifest: JSON.stringify({
      slots: {
        'listing.sidebar': ['crm:ActivityWidget'],
        'manager.guests': ['crm:GuestHistory'],
      },
    }),
  },
  {
    name: 'pwa',
    displayName: 'Progressive Web App',
    category: 'operations',
    manifest: JSON.stringify({
      slots: {
        'listing.header': ['pwa:PWAInstallBanner'],
        'guest.dashboard.bottom': ['pwa:PWAInstallButton'],
      },
    }),
  },
  { name: 'loyalty', displayName: 'Loyalty Program', category: 'marketing', manifest: '{}' },
  {
    name: 'stripe-payments',
    displayName: 'Stripe Payments',
    category: 'commerce',
    manifest: '{}',
  },
  { name: 'ical', displayName: 'iCal Sync', category: 'operations', manifest: '{}' },
  {
    name: 'channel-manager',
    displayName: 'Channel Manager',
    category: 'operations',
    manifest: '{}',
  },
  {
    name: 'test-probe',
    displayName: 'Test Probe',
    category: 'testing',
    manifest: JSON.stringify({
      slots: {
        DASHBOARD_WIDGETS: ['test-probe:ProbeWidget'],
        'listing.sidebar': ['test-probe:ProbeSidebarWidget'],
      },
    }),
  },
  {
    name: 'resource',
    displayName: 'Resource Listings',
    category: 'marketplace',
    manifest: JSON.stringify({
      slots: {
        'public.homepage': ['resource:FeaturedListings'],
        'public.search': ['resource:SearchBar'],
        'public.listing-detail': ['resource:ListingDetail'],
        'master.listings': ['resource:MasterListingsTable'],
        'manage.property': ['resource:AdminEditForm'],
      },
    }),
  },
];

export function getSqlite(): Database.Database {
  return sqliteDb!;
}

const idDefault = 'TEXT PRIMARY KEY';

/**
 * DrizzleDatabaseWrapper
 * ──────────────────────
 * A bridge between Drizzle ORM and a raw SQLite driver, providing
 * synchronous execution and row normalization for compatibility.
 */
class DrizzleDatabaseWrapper {
  private get isPostgres() {
    return !!pgPool;
  }

  private _transformSql(sql: string, args: any[]) {
    if (!this.isPostgres) {
      const { sqliteSql, placeholders, paramIndices } = this._prepareSql(sql);
      const finalArgs = this._wrapArgs(args, placeholders, paramIndices);
      return { finalSql: sqliteSql, finalParams: finalArgs };
    } else {
      let tempSql = sql.replace(/\$(\d+)/g, '?');
      let count = 1;
      const finalSql = tempSql.replace(/\?/g, () => `$${count++}`);
      let finalParams = args;
      if (args.length === 1 && Array.isArray(args[0])) {
        finalParams = args[0];
      }
      return { finalSql, finalParams };
    }
  }

  prepare(sql: string) {
    if (this.isPostgres) {
      return {
        all: async (...args: any[]) => {
          const { finalSql, finalParams } = this._transformSql(sql, args);
          const res = await pgPool.query(finalSql, finalParams);
          return res.rows.map((r: any) => this._normalizeRow(r));
        },
        get: async (...args: any[]) => {
          const { finalSql, finalParams } = this._transformSql(sql, args);
          const res = await pgPool.query(finalSql, finalParams);
          return res.rows.length > 0 ? this._normalizeRow(res.rows[0]) : null;
        },
        run: async (...args: any[]) => {
          const { finalSql, finalParams } = this._transformSql(sql, args);
          const res = await pgPool.query(finalSql, finalParams);
          return { changes: res.rowCount, lastInsertRowid: null };
        },
      } as any;
    }

    const { sqliteSql, placeholders, paramIndices } = this._prepareSql(sql);
    let stmt: any;
    try {
      stmt = getSqlite().prepare(sqliteSql);
    } catch (err) {
      if (process.env.NODE_ENV === 'test' && !sqliteSql.includes('FALLBACK_TEST')) {
        logger.warn(`prepare failed for "${sqliteSql}":`, err);
      }
      logger.warn(`prepare failed for "${sqliteSql}":`, err);
      return {
        all: () => [],
        get: () => null,
        run: () => ({ changes: 0, lastInsertRowid: null }),
      } as any;
    }

    const originalGet = stmt.get.bind(stmt);
    stmt.get = (...args: any[]) => {
      try {
        const result = originalGet(...this._wrapArgs(args, placeholders, paramIndices));
        return this._normalizeRow(result);
      } catch (err) {
        logger.error(`get failed for "${sqliteSql}":`, err);
        return null;
      }
    };

    const originalAll = stmt.all.bind(stmt);
    stmt.all = (...args: any[]) => {
      try {
        const results = originalAll(...this._wrapArgs(args, placeholders, paramIndices));
        return (results || []).map((r: any) => this._normalizeRow(r));
      } catch (err) {
        logger.error(`all failed for "${sqliteSql}":`, err);
        return [];
      }
    };

    const originalRun = stmt.run.bind(stmt);
    stmt.run = (...args: any[]) => {
      try {
        return originalRun(...this._wrapArgs(args, placeholders, paramIndices));
      } catch (err) {
        logger.error(`run failed for "${sqliteSql}":`, err);
        return { changes: 0, lastInsertRowid: null };
      }
    };

    return stmt;
  }

  async execute(sql: string, params: any[] = []) {
    const p = this.prepare(sql);
    const res = p.run(...params);
    return res instanceof Promise ? await res : res;
  }

  async exec(sql: string, params: any[] = []) {
    if (this.isPostgres) {
      const { finalSql, finalParams } = this._transformSql(sql, params);
      return pgPool.query(finalSql, finalParams);
    }
    if (params.length > 0) {
      return this.prepare(sql).run(...params);
    }
    return getSqlite().exec(sql);
  }

  async query(sql: string, params: any[] = []) {
    const p = this.prepare(sql);
    const res = p.all(...params);
    return res instanceof Promise ? await res : res;
  }

  async queryOne(sql: string, params: any[] = []) {
    const p = this.prepare(sql);
    const res = p.get(...params);
    return res instanceof Promise ? await res : res;
  }

  async createTable(tableName: string, columnsSql: string) {
    const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnsSql})`;
    if (this.isPostgres) {
      // Basic type mapping for cross-dialect compatibility in createTable
      let pgColumns = columnsSql
        .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
        .replace(/DATETIME/gi, 'TIMESTAMPTZ')
        .replace(/TEXT PRIMARY KEY/gi, 'TEXT PRIMARY KEY');
      return pgPool.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${pgColumns})`);
    }
    return getSqlite().exec(sql);
  }

  async dropTable(tableName: string) {
    if (this.isPostgres) {
      return pgPool.query(`DROP TABLE IF EXISTS ${tableName} CASCADE`);
    }
    return getSqlite().exec(`DROP TABLE IF EXISTS ${tableName}`);
  }

  async tableExists(tableName: string): Promise<boolean> {
    if (this.isPostgres) {
      const res = await pgPool.query(
        'SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)',
        [tableName.toLowerCase()]
      );
      return res.rows[0].exists;
    }
    const row = getSqlite()
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .get(tableName);
    return !!row;
  }

  private _prepareSql(sql: string) {
    const paramIndices: number[] = [];
    const sqliteSql = sql.replace(/\$(\d+)/g, (match, n) => {
      paramIndices.push(parseInt(n));
      return '?';
    });
    const questionMarks = (sql.match(/\?/g) || []).length;
    const maxIndex = paramIndices.length > 0 ? Math.max(...paramIndices) : 0;
    const placeholders = Math.max(maxIndex, questionMarks);
    return { sqliteSql, placeholders, paramIndices };
  }

  private _wrapArgs(args: any[], placeholders: number, paramIndices: number[]) {
    let baseArgs = args;
    if (args.length === 1 && Array.isArray(args[0])) {
      baseArgs = args[0];
    } else if (args.length === 0 && placeholders > 0) {
      baseArgs = [];
    }
    let finalArgs: any[];
    if (paramIndices.length > 0) {
      finalArgs = paramIndices.map((idx) => baseArgs[idx - 1]);
    } else {
      finalArgs = baseArgs;
    }
    return finalArgs.map((arg) => {
      if (arg === undefined) return null;
      if (typeof arg === 'boolean') return arg ? 1 : 0;
      if (arg instanceof Date) return arg.getTime();
      return arg;
    });
  }

  private _normalizeRow(result: any) {
    if (result === undefined || result === null) return null;
    const jsonColumns = [
      'config',
      'manifest',
      'settings',
      'branding',
      'event_data',
      'permissions',
      'plugins',
    ];
    const keyMapping: Record<string, string> = {
      display_name: 'displayName',
      displayname: 'displayName',
      is_official: 'isOfficial',
      isofficial: 'isOfficial',
      is_active: 'isActive',
      isactive: 'isActive',
      is_enabled: 'isEnabled',
      isenabled: 'isEnabled',
      primary_image: 'primaryImage',
      primaryimage: 'primaryImage',
      email_verified: 'emailVerified',
      emailverified: 'emailVerified',
      property_id: 'propertyId',
      propertyid: 'propertyId',
      user_id: 'userId',
      userid: 'userId',
      plugin_name: 'pluginName',
      pluginname: 'pluginName',
      check_in: 'checkIn',
      checkin: 'checkIn',
      check_out: 'checkOut',
      checkout: 'checkOut',
      guest_count: 'guestCount',
      guestcount: 'guestCount',
      total_price: 'totalPrice',
      totalprice: 'totalPrice',
      created_at: 'createdAt',
      createdat: 'createdAt',
      updated_at: 'updatedAt',
      updatedat: 'updatedAt',
      min_price_per_night: 'minPricePerNight',
      minpricepernight: 'minPricePerNight',
      price_per_night: 'pricePerNight',
      pricepernight: 'pricePerNight',
    };
    const normalized: any = {};
    for (const key of Object.keys(result)) {
      const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const finalKey = keyMapping[normalizedKey] || normalizedKey;
      let value = result[key];
      const isBoolColumn =
        normalizedKey.startsWith('is_') ||
        normalizedKey.endsWith('_enabled') ||
        normalizedKey.endsWith('_complete') ||
        normalizedKey === 'email_verified' ||
        normalizedKey === 'is_official' ||
        normalizedKey === 'is_active';
      if (isBoolColumn && (value === 1 || value === 0)) value = value === 1;
      if (jsonColumns.includes(normalizedKey) && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {}
      }
      normalized[finalKey] = value;
      if (finalKey !== key) {
        normalized[key] = value;
      }
    }
    return normalized;
  }

  async transaction<T>(callback: (tx: DrizzleDatabaseWrapper) => Promise<T>): Promise<T | null> {
    if (this.isPostgres) {
      const client = await pgPool.connect();
      try {
        await client.query('BEGIN');
        const scopedTx = Object.create(this, {
          prepare: {
            value: (sql: string) =>
              ({
                all: async (...args: any[]) => {
                  const { finalSql, finalParams } = this._transformSql(sql, args);
                  const res = await client.query(finalSql, finalParams);
                  return res.rows.map((r: any) => this._normalizeRow(r));
                },
                get: async (...args: any[]) => {
                  const { finalSql, finalParams } = this._transformSql(sql, args);
                  const res = await client.query(finalSql, finalParams);
                  return res.rows.length > 0 ? this._normalizeRow(res.rows[0]) : null;
                },
                run: async (...args: any[]) => {
                  const { finalSql, finalParams } = this._transformSql(sql, args);
                  const res = await client.query(finalSql, finalParams);
                  return { changes: res.rowCount, lastInsertRowid: null };
                },
              }) as any,
          },
        });
        const result = await callback(scopedTx);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        logger.warn('Transaction failed:', err);
        return null;
      } finally {
        client.release();
      }
    }
    try {
      getSqlite().exec('BEGIN');
      const result = await callback(this);
      getSqlite().exec('COMMIT');
      return result;
    } catch (err) {
      logger.warn('Transaction failed:', err);
      getSqlite().exec('ROLLBACK');
      return null;
    }
  }

  resetMockStore() {
    try {
      // -----------------------------------------------------------------------
      // Core framework tables (generic):
      //   users, sessions, accounts, verifications, user_roles,
      //   available_plugins, plugin_submissions, profiles
      //   properties (tenants), property_staff (tenantStaff),
      //   property_plugins (tenantPlugins)
      //
      // Domain tables kept here ONLY for test backward-compatibility.
      // They are logically owned by their respective plugins.
      // New code should use api.db.createTable() inside the plugin init.
      // -----------------------------------------------------------------------
      const coreTables = [
        `DROP TABLE IF EXISTS schema_migrations`,
        `DROP TABLE IF EXISTS postmeta`,
        `DROP TABLE IF EXISTS posts`,
        `DROP TABLE IF EXISTS options`,
        `DROP TABLE IF EXISTS build_queue`,
        `DROP TABLE IF EXISTS sites`,
        `DROP TABLE IF EXISTS plugin_submissions`,
        `DROP TABLE IF EXISTS available_plugins`,
        `DROP TABLE IF EXISTS properties`,
        `DROP TABLE IF EXISTS property_staff`,
        `DROP TABLE IF EXISTS marketplace_bookings`,
        `DROP TABLE IF EXISTS commission_rates`,
        `DROP TABLE IF EXISTS commission_transactions`,
        `DROP TABLE IF EXISTS stripe_connect_accounts`,
        `DROP TABLE IF EXISTS payout_summaries`,
        `DROP TABLE IF EXISTS property_plugins`,
        `DROP TABLE IF EXISTS plugin_assets`,
        `DROP TABLE IF EXISTS plugin_analytics`,
        `DROP TABLE IF EXISTS rooms`,
        `DROP TABLE IF EXISTS room_types`,
        `DROP TABLE IF EXISTS reservations`,
        `DROP TABLE IF EXISTS events`,
        `DROP TABLE IF EXISTS stats`,
        `DROP TABLE IF EXISTS test_table`,
        `DROP TABLE IF EXISTS test`,
        `DROP TABLE IF EXISTS coverage_test_table`,
        `DROP TABLE IF EXISTS plugin_test_probe_probes`,
        `DROP TABLE IF EXISTS plugin_booking_bookings`,
        `DROP TABLE IF EXISTS plugin_booking_room_types`,
        `DROP TABLE IF EXISTS plugin_crm_activities`,
        `DROP TABLE IF EXISTS plugin_pwa_settings`,
        `DROP TABLE IF EXISTS plugin_pwa_subscriptions`,
        `DROP TABLE IF EXISTS plugin_resource_listings`,
        `DROP TABLE IF EXISTS homepage_config`,
        `DROP TABLE IF EXISTS categories`,
        `DROP TABLE IF EXISTS idempotency_keys`,
        `CREATE TABLE IF NOT EXISTS users (id ${idDefault}, email TEXT NOT NULL UNIQUE, name TEXT, email_verified INTEGER, image TEXT, password TEXT, role TEXT, created_at INTEGER, updated_at INTEGER, is_verified INTEGER)`,
        `CREATE TABLE IF NOT EXISTS sessions (id ${idDefault}, user_id TEXT NOT NULL, token TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, ip_address TEXT, user_agent TEXT, created_at INTEGER, updated_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS accounts (id ${idDefault}, user_id TEXT NOT NULL, account_id TEXT NOT NULL, provider_id TEXT NOT NULL, access_token TEXT, refresh_token TEXT, id_token TEXT, expires_at INTEGER, password TEXT, created_at INTEGER, updated_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS verifications (id ${idDefault}, identifier TEXT NOT NULL, value TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER, updated_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS user_roles (id ${idDefault}, user_id TEXT NOT NULL, role TEXT NOT NULL, permissions TEXT)`,
        `CREATE TABLE IF NOT EXISTS available_plugins (id ${idDefault}, name TEXT NOT NULL UNIQUE, display_name TEXT, description TEXT, category TEXT, is_official INTEGER, is_active INTEGER, manifest TEXT, entry_point_url TEXT, config_schema TEXT, version TEXT, updated_at INTEGER, plan_requirement TEXT NOT NULL DEFAULT 'basic', post_types TEXT, campops_version TEXT, review_status TEXT NOT NULL DEFAULT 'approved', zip_url TEXT)`,
        `CREATE TABLE IF NOT EXISTS properties (id ${idDefault}, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, description TEXT, short_description TEXT, city TEXT, country TEXT, settings TEXT, branding TEXT, is_active INTEGER, owner_id TEXT, created_at INTEGER, subdomain TEXT, custom_domain TEXT, domain_verified INTEGER DEFAULT 0, plan TEXT, primary_image TEXT, is_featured INTEGER, rating REAL, amenities TEXT, price_per_night INTEGER, min_price_per_night INTEGER, currency_code TEXT DEFAULT 'USD', featured_order INTEGER)`,
        `CREATE TABLE IF NOT EXISTS property_staff (id ${idDefault}, property_id TEXT NOT NULL, user_id TEXT NOT NULL, role TEXT NOT NULL, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS marketplace_bookings (id ${idDefault}, property_id TEXT NOT NULL, room_type_id TEXT, guest_name TEXT NOT NULL, guest_email TEXT NOT NULL, check_in TEXT, check_out TEXT, total_amount_cents INTEGER NOT NULL, status TEXT, created_at INTEGER, booking_type TEXT, guest_count INTEGER, currency TEXT, stripe_payment_intent_id TEXT, stripe_checkout_session_id TEXT)`,
        `CREATE TABLE IF NOT EXISTS commission_rates (id ${idDefault}, property_id TEXT, rate_percentage REAL NOT NULL, flat_fee_cents INTEGER, applies_to TEXT, is_active INTEGER, created_at INTEGER, created_by TEXT)`,
        `CREATE TABLE IF NOT EXISTS commission_transactions (id ${idDefault}, booking_id TEXT, property_id TEXT, stripe_account_id TEXT, total_amount_cents INTEGER, commission_rate_used REAL, commission_amount_cents INTEGER, net_payout_cents INTEGER, currency TEXT, status TEXT, stripe_transfer_id TEXT, transferred_at INTEGER, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS stripe_connect_accounts (id ${idDefault}, property_id TEXT, owner_id TEXT, stripe_account_id TEXT, stripe_account_type TEXT, charges_enabled INTEGER, payouts_enabled INTEGER, country TEXT, currency TEXT, onboarding_complete INTEGER, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS payout_summaries (id ${idDefault}, property_id TEXT, owner_id TEXT, period_start TEXT, period_end TEXT, total_bookings INTEGER, total_revenue_cents INTEGER, total_commission_cents INTEGER, net_payout_cents INTEGER, currency TEXT, status TEXT, stripe_payout_id TEXT, paid_at INTEGER, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS property_plugins (id ${idDefault}, property_id TEXT NOT NULL, plugin_name TEXT NOT NULL, is_enabled INTEGER, config TEXT, installed_version TEXT, installed_by TEXT, last_disabled_at INTEGER, created_at INTEGER, activated_at INTEGER, activated_by TEXT, version TEXT, UNIQUE(property_id, plugin_name))`,
        `CREATE TABLE IF NOT EXISTS plugin_assets (id ${idDefault}, plugin_name TEXT, asset_type TEXT, asset_url TEXT, target_location TEXT, load_order INTEGER, is_active INTEGER, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS plugin_analytics (id ${idDefault}, plugin_name TEXT, property_id TEXT, event_type TEXT, event_data TEXT, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS plugin_ui_registry (id TEXT PRIMARY KEY, plugin_id TEXT NOT NULL, slot_name TEXT NOT NULL, component_id TEXT NOT NULL, property_id TEXT, config TEXT, created_at TEXT)`,
        `CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, resource_id TEXT, details TEXT, property_id TEXT, ip_address TEXT, created_at TEXT)`,
        `CREATE TABLE IF NOT EXISTS rooms (id ${idDefault}, property_id TEXT, name TEXT, type TEXT, status TEXT, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS room_types (id ${idDefault}, property_id TEXT, name TEXT, description TEXT, base_price_cents INTEGER, capacity INTEGER, created_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS reservations (id ${idDefault}, user_id TEXT, property_id TEXT, check_in TEXT, check_out TEXT, guest_count INTEGER, total_price REAL, status TEXT, created_at TEXT, guest_name TEXT, guest_email TEXT, notes TEXT)`,
        `CREATE TABLE IF NOT EXISTS stats (val INTEGER)`,
        `CREATE TABLE IF NOT EXISTS events (type TEXT)`,
        `CREATE TABLE IF NOT EXISTS test_table (id ${idDefault}, name TEXT, is_active INTEGER)`,
        `CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`,
        `CREATE TABLE IF NOT EXISTS coverage_test_table (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)`,
        `CREATE TABLE IF NOT EXISTS homepage_config (id TEXT PRIMARY KEY, config TEXT)`,
        `CREATE TABLE IF NOT EXISTS profiles (id ${idDefault}, user_id TEXT NOT NULL, full_name TEXT, bio TEXT, phone TEXT)`,
        `CREATE TABLE IF NOT EXISTS categories (id ${idDefault}, name TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, icon TEXT, description TEXT, display_order INTEGER)`,
        `CREATE TABLE IF NOT EXISTS sites (id TEXT PRIMARY KEY, slug TEXT NOT NULL UNIQUE, name TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'basic', subdomain TEXT, custom_domain TEXT, domain_verified INTEGER NOT NULL DEFAULT 0, owner_id TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL DEFAULT (unixepoch()), updated_at INTEGER NOT NULL DEFAULT (unixepoch()))`,
        `CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE, post_type TEXT NOT NULL, post_status TEXT NOT NULL DEFAULT 'publish', post_slug TEXT, post_title TEXT NOT NULL DEFAULT '', post_content TEXT, author_id TEXT, parent_id TEXT, menu_order INTEGER NOT NULL DEFAULT 0, created_at INTEGER, updated_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS postmeta (id INTEGER PRIMARY KEY AUTOINCREMENT, post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE, meta_key TEXT NOT NULL, meta_value TEXT, UNIQUE(post_id, meta_key))`,
        `CREATE TABLE IF NOT EXISTS options (id INTEGER PRIMARY KEY AUTOINCREMENT, site_id TEXT NOT NULL, option_name TEXT NOT NULL, option_value TEXT, autoload INTEGER NOT NULL DEFAULT 0, UNIQUE(site_id, option_name))`,
        `CREATE TABLE IF NOT EXISTS build_queue (id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))), site_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', triggered_by TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()), started_at INTEGER, finished_at INTEGER, error TEXT)`,
        `CREATE TABLE IF NOT EXISTS plugin_submissions (id TEXT PRIMARY KEY, plugin_id TEXT NOT NULL, submitted_by TEXT NOT NULL, version TEXT NOT NULL, zip_url TEXT, manifest TEXT, review_notes TEXT, status TEXT NOT NULL DEFAULT 'pending', reviewed_by TEXT, submitted_at INTEGER NOT NULL DEFAULT (unixepoch()), reviewed_at INTEGER)`,
        `CREATE TABLE IF NOT EXISTS idempotency_keys (key TEXT PRIMARY KEY, response TEXT NOT NULL, created_at INTEGER)`,
      ];

      for (const sql of coreTables) {
        logger.info('Executing:', sql.substring(0, 50));
        getSqlite().exec(sql);
      }

      // Reapply migrations so any additional structural adjustments are made
      runMigrations(getSqlite());

      // Seed Users
      // Pre-computed scrypt hash for 'password123' used by Better Auth
      const hashedPassword =
        'e8c2be85ca9fe13f47c6ef1de40ac92d:4a8432eb6e15066427f96f1f9a3ca66fa19037c985f5cd3a5a46a73226d2f59f09ca5d4398b52918403865dd9f5ce4f254bddfbf16afc92517dbf50115f9799c';

      const isProd = process.env.NODE_ENV === 'production';
      if (!isProd || process.env.SEED_TEST_USERS === 'true') {
        const testUsers = [
          {
            id: 'master-admin',
            email: 'master@sinaicamps.com',
            role: 'master',
            name: 'Master Admin',
          },
          {
            id: 'manager-user-1',
            email: 'safari@sinaicamps.com',
            role: 'manager',
            name: 'Property Manager',
          },
          {
            id: 'staff-user-1',
            email: 'staff@sinaicamps.com',
            role: 'staff',
            name: 'Staff Member',
          },
          { id: 'guest-user-1', email: 'guest@sinaicamps.com', role: 'guest', name: 'John Guest' },
          {
            id: 'integration-guest-1',
            email: 'integration@sinaicamps.com',
            role: 'guest',
            name: 'Integration Guest',
          },
          {
            id: 'master-user-2',
            email: 'admin@sinaicamps.com',
            role: 'master',
            name: 'Demo Admin',
          },
          {
            id: 'admin-acacia',
            email: 'acacia@acaciacamp.com',
            role: 'manager',
            name: 'Acacia Admin',
          },
        ];

        for (const user of testUsers) {
          getSqlite()
            .prepare(
              'INSERT OR IGNORE INTO users (id, email, password, role, name, email_verified, is_verified) VALUES (?, ?, ?, ?, ?, 1, 1)'
            )
            .run(user.id, user.email, hashedPassword, user.role, user.name);

          getSqlite()
            .prepare(
              'INSERT OR IGNORE INTO accounts (id, user_id, account_id, provider_id, password) VALUES (?, ?, ?, ?, ?)'
            )
            .run(`${user.id}-account`, user.id, user.id, 'credential', hashedPassword);

          const rbacRole =
            user.role === 'master' ? 'marketplace_master' : `marketplace_${user.role}`;
          getSqlite()
            .prepare('INSERT OR IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, ?)')
            .run(`${user.id}-role`, user.id, rbacRole);

          // Seed Profile
          getSqlite()
            .prepare(
              'INSERT OR IGNORE INTO profiles (id, user_id, full_name, phone) VALUES (?, ?, ?, ?)'
            )
            .run(`${user.id}-profile`, user.id, user.name, '+1234567890');
        }
      }

      // Seed room types (booking plugin domain — kept for test backward-compat)
      // New verticals should seed their own tables inside their plugin init().
      const roomTypes = [
        {
          id: 'room-1',
          property_id: '1',
          name: 'Luxury Tent',
          description: 'Experience the wild in comfort',
          base_price_cents: 25000,
          capacity: 2,
        },
        {
          id: 'room-2',
          property_id: '1',
          name: 'Family Lodge',
          description: 'Space for the whole family',
          base_price_cents: 45000,
          capacity: 4,
        },
        {
          id: 'room-3',
          property_id: '2',
          name: 'Alpine Suite',
          description: 'Cozy mountain retreat',
          base_price_cents: 20000,
          capacity: 2,
        },
      ];

      for (const rt of roomTypes) {
        getSqlite()
          .prepare(
            'INSERT OR IGNORE INTO room_types (id, property_id, name, description, base_price_cents, capacity) VALUES (?, ?, ?, ?, ?, ?)'
          )
          .run(rt.id, rt.property_id, rt.name, rt.description, rt.base_price_cents, rt.capacity);
      }

      // Seed tenants (marketplace example: Safari Camp, Mountain Lodge, Acacia Camp)
      // NOTE: these are example tenant records for the bundled marketplace
      // application.  The core framework is tenant-agnostic; these rows exist
      // only so that existing integration/e2e tests continue to pass.
      const properties = [
        {
          id: '1',
          slug: 'safari-camp',
          name: 'Safari Camp',
          city: 'Maasai Mara',
          owner: 'manager-user-1',
          plan: 'premium',
          custom_domain: '',
          domain_verified: 0,
        },
        {
          id: '2',
          slug: 'mountain-lodge',
          name: 'Mountain Lodge',
          city: 'Rocky Mountains',
          owner: 'master-user-2',
          plan: 'basic',
          custom_domain: '',
          domain_verified: 0,
        },
        {
          id: '3',
          slug: 'acacia',
          name: 'Acacia Camp',
          city: 'Dahab',
          owner: 'admin-acacia',
          plan: 'ultimate',
          custom_domain: 'acaciacamp.com',
          domain_verified: 1,
        },
      ];
      for (const p of properties) {
        getSqlite()
          .prepare(
            'INSERT OR REPLACE INTO properties (id, slug, name, city, owner_id, is_active, domain_verified, plan, custom_domain, settings) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)'
          )
          .run(
            p.id,
            p.slug,
            p.name,
            p.city,
            p.owner,
            p.domain_verified ?? 1,
            p.plan ?? 'basic',
            p.custom_domain ?? '',
            JSON.stringify({
              customDomain: p.custom_domain || '',
              customDomainVerified: !!p.custom_domain,
            })
          );
      }

      // Seed Property Staff (for access control)
      const staffMembers = [
        { id: 'ps-1', property_id: '1', user_id: 'manager-user-1', role: 'manager' },
        { id: 'ps-2', property_id: '1', user_id: 'staff-user-1', role: 'staff' },
        { id: 'ps-3', property_id: '2', user_id: 'master-user-2', role: 'manager' },
        { id: 'ps-acacia-admin', property_id: '3', user_id: 'admin-acacia', role: 'manager' },
      ];
      for (const s of staffMembers) {
        getSqlite()
          .prepare(
            'INSERT OR IGNORE INTO property_staff (id, property_id, user_id, role) VALUES (?, ?, ?, ?)'
          )
          .run(s.id, s.property_id, s.user_id, s.role);
      }

      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO properties (id, slug, name, city, country, min_price_per_night, currency_code, is_active, owner_id, domain_verified) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)'
        )
        .run(
          '2',
          'mountain-lodge',
          'Mountain Lodge',
          'Chamonix',
          'France',
          150,
          'EUR',
          1,
          'master-user-2'
        );

      // Seed reservations
      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO reservations (id, user_id, property_id, check_in, check_out, guest_count, total_price, status, created_at, guest_name, guest_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          'res-1',
          'guest-user-1',
          '1',
          '2026-06-01',
          '2026-06-05',
          2,
          800.0,
          'confirmed',
          '2026-05-01',
          'John Guest',
          'guest@sinaicamps.com'
        );

      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO reservations (id, user_id, property_id, check_in, check_out, guest_count, total_price, status, created_at, guest_name, guest_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          'res-integration',
          'integration-guest-1',
          '1',
          '2026-06-10',
          '2026-06-15',
          2,
          1200.0,
          'confirmed',
          '2026-05-02',
          'Integration Guest',
          'integration@sinaicamps.com'
        );

      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO reservations (id, user_id, property_id, check_in, check_out, guest_count, total_price, status, created_at, guest_name, guest_email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          'res-lodge-1',
          'guest-user-1',
          '2',
          '2026-07-01',
          '2026-07-05',
          2,
          600.0,
          'confirmed',
          '2026-05-03',
          'John Guest',
          'guest@sinaicamps.com'
        );

      // Seed marketplace bookings (for commissions)
      getSqlite()
        .prepare(
          "INSERT OR IGNORE INTO marketplace_bookings (id, property_id, guest_name, guest_email, total_amount_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .run('bk-1', '1', 'John Guest', 'guest@sinaicamps.com', 80000, 'confirmed');
      getSqlite()
        .prepare(
          "INSERT OR IGNORE INTO marketplace_bookings (id, property_id, guest_name, guest_email, total_amount_cents, status, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))"
        )
        .run('bk-2', '1', 'Integration Guest', 'integration@sinaicamps.com', 120000, 'confirmed');

      // Seed commission rates
      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO commission_rates (id, property_id, rate_percentage, is_active) VALUES (?, ?, ?, ?)'
        )
        .run('rate-1', '1', 12.5, 1);
      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO commission_rates (id, property_id, rate_percentage, is_active) VALUES (?, ?, ?, ?)'
        )
        .run('rate-2', '2', 15.0, 1);
      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO commission_rates (id, property_id, rate_percentage, is_active) VALUES (?, ?, ?, ?)'
        )
        .run('rate-global', null, 10.0, 1);

      // Seed homepage config
      getSqlite()
        .prepare('INSERT OR IGNORE INTO homepage_config (id, config) VALUES (?, ?)')
        .run(
          'main',
          JSON.stringify({
            sections: ['hero', 'search', 'featured-listings', 'categories', 'footer'],
          })
        );

      // Seed categories
      const categories = [
        { id: 'cat-1', name: 'Glamping', slug: 'glamping', icon: 'tent' },
        { id: 'cat-2', name: 'Luxury', slug: 'luxury', icon: 'sparkles' },
        { id: 'cat-3', name: 'Adventure', slug: 'adventure', icon: 'mountain' },
      ];
      for (const cat of categories) {
        getSqlite()
          .prepare(
            'INSERT OR IGNORE INTO categories (id, name, slug, icon, display_order) VALUES (?, ?, ?, ?, ?)'
          )
          .run(cat.id, cat.name, cat.slug, cat.icon, 0);
      }

      getSqlite()
        .prepare(
          'INSERT OR REPLACE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp-1', '1', 'booking', 1);

      getSqlite()
        .prepare(
          'INSERT OR REPLACE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp-2', '1', 'crm', 1);

      getSqlite()
        .prepare(
          'INSERT OR REPLACE INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp-pwa', '1', 'pwa', 1);

      // Re-seed available_plugins after table recreation
      seedAvailablePlugins();
    } catch (err) {
      logger.warn('resetMockStore failed:', err);
    }
  }
}

export const db = new DrizzleDatabaseWrapper();

// Initialize idempotency_keys table at startup
db.createTable(
  'idempotency_keys',
  'key TEXT PRIMARY KEY, response TEXT NOT NULL, created_at INTEGER'
).catch((e) => logger.error('Failed to create idempotency_keys table:', e));

// Seed available_plugins on every startup (safe in production — uses INSERT OR IGNORE)
function seedAvailablePlugins() {
  if (!sqliteDb) return;
  try {
    const row = getSqlite()
      .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='available_plugins'")
      .get() as any;
    if (!row || row.count === 0) return;

    logger.info('[db] Seeding available_plugins from filesystem (INSERT OR IGNORE — safe)');

    const pluginsDir = path.join(process.cwd(), 'plugins');
    if (fs.existsSync(pluginsDir)) {
      const discovered = fs
        .readdirSync(pluginsDir)
        .filter((f) => fs.statSync(path.join(pluginsDir, f)).isDirectory());

      for (const pluginId of discovered) {
        const manifestPath = path.join(pluginsDir, pluginId, 'package.json');
        let manifest = {};
        let displayName = pluginId.charAt(0).toUpperCase() + pluginId.slice(1);

        if (fs.existsSync(manifestPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
            manifest = pkg.sinaicamps || {};
            if (pkg.description) displayName = pkg.description;
          } catch (e) {}
        }

        const special = defaultPluginDefs.find((p) => p.name === pluginId);
        const finalManifest = special ? special.manifest : JSON.stringify(manifest);
        const finalDisplayName = special ? special.displayName : displayName;

        getSqlite()
          .prepare(
            'INSERT OR IGNORE INTO available_plugins (id, name, display_name, category, is_official, is_active, manifest, entry_point_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          )
          .run(
            pluginId,
            pluginId,
            finalDisplayName,
            special?.category || 'utility',
            1,
            1,
            finalManifest,
            `/plugins/${pluginId}/index.js`
          );
      }
    }

    // Ensure all default (official) plugins are seeded even if not discovered in filesystem
    for (const p of defaultPluginDefs) {
      getSqlite()
        .prepare(
          'INSERT OR IGNORE INTO available_plugins (id, name, display_name, category, is_official, is_active, manifest, entry_point_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          p.name,
          p.name,
          p.displayName,
          p.category || 'utility',
          1,
          1,
          p.manifest || '{}',
          `/plugins/${p.name}/index.js`
        );
    }

    // Force owner plugin to be active
    getSqlite().prepare("UPDATE available_plugins SET is_active = 1 WHERE name = 'owner'").run();

    logger.info('[db] Plugin seeding complete');
  } catch (err) {
    logger.error('[db] Failed to seed available_plugins:', err);
  }
}

seedAvailablePlugins();

// For unit tests
export const resetMockStore = () => {
  db.resetMockStore();
};

export const clearMockStore = () => {
  db.resetMockStore();
};

// Always ensure seeded in dev/test if users table missing or empty
const shouldRunResetCheck =
  process.env.NODE_ENV !== 'production' &&
  !process.env.DATABASE_URL?.startsWith('postgres') &&
  !pgPool &&
  (process.env.NODE_ENV === 'test' || process.argv.includes('--force-reset'));

if (shouldRunResetCheck) {
  try {
    const criticalTables = ['users', 'properties', 'available_plugins', 'property_staff'];
    let needsReset = false;

    for (const table of criticalTables) {
      const tableExists = getSqlite()
        .prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      if (!tableExists || (tableExists as any).count === 0) {
        needsReset = true;
        break;
      }
      const rowCount = getSqlite()
        .prepare('SELECT count(*) as count FROM ' + table)
        .get();
      if (!rowCount || (rowCount as any).count === 0) {
        needsReset = true;
        break;
      }
    }

    if (needsReset) {
      logger.info('Critical table missing or empty, forcing reset...');
      db.resetMockStore();
    }
  } catch (e) {
    logger.error('Error checking database state:', e);
  }
}

// Normalize property names to match test expectations (runs only in local SQLite dev/test)
if (shouldRunResetCheck || (process.env.NODE_ENV === 'test' && !pgPool)) {
  try {
    getSqlite()
      .prepare(
        "UPDATE properties SET name = 'Safari Camp' WHERE id = '1' AND name != 'Safari Camp'"
      )
      .run();
    getSqlite()
      .prepare(
        'INSERT OR IGNORE INTO properties (id, slug, name, city, owner_id, is_active) VALUES (?, ?, ?, ?, ?, 1)'
      )
      .run('2', 'mountain-lodge', 'Mountain Lodge', 'Rocky Mountains', 'master-user-2');
    getSqlite()
      .prepare(
        'INSERT OR IGNORE INTO property_staff (id, property_id, user_id, role) VALUES (?, ?, ?, ?)'
      )
      .run('ps-3', '2', 'master-user-2', 'manager');
    // Ensure booking plugin has an entry for property 1 if not already present
    const bkExists = getSqlite().prepare("SELECT id FROM property_plugins WHERE id='pp-1'").get();
    if (!bkExists) {
      getSqlite()
        .prepare(
          'INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp-1', '1', 'booking', 1);
    }
  } catch (e) {
    logger.error('Error normalizing property data:', e);
  }
}

export async function closeConnection() {
  if (pgPool) {
    logger.info('Closing PostgreSQL connection pool...');
    await pgPool.end();
    pgPool = null;
  }
  if (sqliteDb) {
    logger.info('Closing SQLite database connection...');
    sqliteDb.close();
    sqliteDb = null;
  }
}

if (typeof process !== 'undefined') {
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}, commencing graceful database shutdown.`);
    await closeConnection();
    process.exit(0);
  };
  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
