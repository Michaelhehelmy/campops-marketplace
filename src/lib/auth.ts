import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from './db';
import * as schema from '../db/schema';
import { logger } from './logger';

export const auth = betterAuth({
  trustedOrigins: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : []),
  ],
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
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        defaultValue: 'guest',
      },
    },
  },
  plugins: [
    // Better Auth doesn't have a built-in 'roles' plugin that exactly matches the request,
    // but we can use the 'user' additionalFields and then define our roles logic.
  ],
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
