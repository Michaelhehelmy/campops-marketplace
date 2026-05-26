import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { drizzle } from './db';
import * as schema from '../db/schema';
import { logger } from './logger';
import { nextCookies } from 'better-auth/next-js';

const STATIC_TRUSTED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://*.sinaicamps.com',
  ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
];

async function getCustomDomainOrigins(): Promise<string[]> {
  try {
    const rows = await drizzle
      .select({ customDomain: schema.sites.customDomain })
      .from(schema.sites)
      .where(eq(schema.sites.domainVerified, true));
    const origins: string[] = [];
    for (const row of rows) {
      if (row.customDomain) {
        origins.push(`https://${row.customDomain}`, `http://${row.customDomain}`);
      }
    }
    return origins;
  } catch (e) {
    logger.warn('Failed to load custom domain trusted origins', e);
    return [];
  }
}

export const auth = betterAuth({
  trustedOrigins: async () => [...STATIC_TRUSTED_ORIGINS, ...(await getCustomDomainOrigins())],
  session: {
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day — refresh session when < 1 day remaining
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  database: drizzleAdapter(drizzle, {
    provider:
      typeof process !== 'undefined' &&
      (process.env.VITEST === 'true' || process.env.NODE_ENV === 'test')
        ? 'sqlite'
        : process.env.DATABASE_URL
          ? 'pg'
          : 'sqlite',
    usePlural: true,
    schema: {
      ...schema,
    },
  }),
  rateLimit: {
    enabled: !(process.env.SKIP_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'test'),
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'guest',
      },
    },
  },
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

/**
 * Retrieves the current session from a standard Request object.
 * Used primarily in plugin route handlers to authenticate users.
 */
export async function getAuthSession(req: Request) {
  try {
    return await auth.api.getSession({
      headers: req.headers,
    });
  } catch (error) {
    logger.error('Failed to get session:', error);
    return null;
  }
}
