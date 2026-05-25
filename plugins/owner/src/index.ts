import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
  full_name: z.string().min(1).max(100),
  property_name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  plan: z
    .enum(['basic', 'subdomain', 'premium', 'custom_domain', 'ultimate'])
    .optional()
    .default('basic'),
  branding: z.any().optional(),
  custom_domain: z.string().max(255).optional(),
  type: z.string().max(50).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  currency_code: z.string().length(3).optional(),
});

const upgradeSchema = z.object({
  siteId: z.string().uuid(),
  newPlan: z.enum(['basic', 'premium', 'ultimate']),
  subdomain: z
    .string()
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  customDomain: z.string().max(255).optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function planSatisfies(required: string, current: string): boolean {
  const order: Record<string, number> = { basic: 0, premium: 1, ultimate: 2 };
  return (order[required] ?? 0) >= (order[current] ?? 0);
}

export default async function init(api: PluginAPI) {
  api.logger.info('owner: initializing');

  // ── POST /api/owner/register ────────────────────────────────────────────
  api.registerRoute('/api/owner/register', {
    POST: async (req: Request) => {
      try {
        const body = await req.json().catch(() => null);
        if (!body) return json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);

        const parsed = registerSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: parsed.error.issues,
            },
            400
          );
        }

        const {
          email,
          password,
          full_name,
          property_name,
          slug,
          plan,
          branding,
          custom_domain,
          type,
          city,
          country,
          currency_code,
        } = parsed.data;

        const normalizedEmail = email.toLowerCase().trim();

        const result = await api.db.transaction(async (tx: any) => {
          const existing = await tx.queryOne('SELECT id FROM users WHERE email = ?', [
            normalizedEmail,
          ]);
          if (existing) throw new Error('409:Email already registered');

          const userId = crypto.randomUUID();
          const hashedPassword = await bcrypt.hash(password, 10);
          await tx.execute(
            'INSERT INTO users (id, email, password, is_verified) VALUES (?, ?, ?, ?)',
            [userId, normalizedEmail, hashedPassword, true]
          );

          const propertyId = crypto.randomUUID();
          const normalisedPlan =
            plan === 'subdomain' ? 'premium' : plan === 'custom_domain' ? 'ultimate' : plan;
          const isPremiumPlan = normalisedPlan === 'premium' || normalisedPlan === 'ultimate';
          const resolvedSubdomain = isPremiumPlan ? slug : null;
          const resolvedCustomDomain = normalisedPlan === 'ultimate' ? custom_domain || null : null;
          const settings = JSON.stringify({
            branding: branding || {},
            features: {
              bookings: true,
              payments: true,
              reviews: true,
              loyalty: false,
              pos: false,
              excursions: true,
              blog: false,
            },
            theme: { mode: 'light' },
          });

          await tx.execute(
            `INSERT INTO properties (id, owner_id, name, slug, plan, is_active, subdomain, custom_domain, domain_verified, type, city, country, currency_code, settings)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              propertyId,
              userId,
              property_name,
              slug,
              normalisedPlan,
              true,
              resolvedSubdomain,
              resolvedCustomDomain,
              normalisedPlan === 'ultimate' ? true : resolvedSubdomain ? true : false,
              type || 'camp',
              city || '',
              country || '',
              currency_code || 'USD',
              settings,
            ]
          );

          await tx.execute('INSERT INTO profiles (id, user_id, full_name) VALUES (?, ?, ?)', [
            crypto.randomUUID(),
            userId,
            full_name,
          ]);

          return { userId, propertyId };
        });

        if (!result) return json({ error: 'Registration failed' }, 500);

        {
          const registrationPlan =
            plan === 'subdomain' ? 'premium' : plan === 'custom_domain' ? 'ultimate' : plan;
          const isPremium = registrationPlan === 'premium' || registrationPlan === 'ultimate';
          const regSubdomain = isPremium ? slug : null;
          const regCustomDomain = registrationPlan === 'ultimate' ? custom_domain || null : null;

          if (isPremium) {
            api.hooks.doAction('core:site:plan_upgraded', {
              siteId: result.propertyId,
              previousPlan: null,
              newPlan: registrationPlan,
              actorId: result.userId,
              subdomain: regSubdomain,
              customDomain: regCustomDomain,
            });
          }
        }

        return json(
          {
            success: true,
            user: { id: result.userId, email: normalizedEmail },
            property: { id: result.propertyId, name: property_name, slug },
          },
          201
        );
      } catch (err: any) {
        if (err.message?.startsWith('409:')) {
          return json({ error: err.message.split(':')[1] }, 409);
        }
        api.logger.error('[Owner Register] Error:', err);
        return json({ error: err.message || 'Registration failed' }, 500);
      }
    },
  });

  // ── GET /api/owner/me ───────────────────────────────────────────────────
  api.registerRoute('/api/owner/me', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) return json({ error: 'Unauthorized' }, 401);

        const { user } = session;

        const hostHeader = req.headers.get('x-forwarded-host') || req.headers.get('host') || '';
        const hostname = hostHeader
          .split(':')[0]
          .replace(/^www\./, '')
          .toLowerCase();

        let property = null;

        const BASE_DOMAIN = (process.env.NEXT_PUBLIC_BASE_DOMAIN || 'sinaicamps.com').toLowerCase();
        const isSubdomain = hostname !== BASE_DOMAIN && hostname.endsWith(`.${BASE_DOMAIN}`);
        const isCustomDomain = hostname && hostname !== BASE_DOMAIN && !isSubdomain;

        if (isCustomDomain || isSubdomain) {
          if (hostname === '127.0.0.1' || hostname === 'localhost') {
            // Local dev test fallback for Acacia Camp (id: 3)
            property = await api.db.queryOne('SELECT * FROM properties WHERE id = 3');
          } else if (isCustomDomain) {
            property = await api.db.queryOne(
              `SELECT * FROM properties WHERE is_active = 1 AND (custom_domain = ? OR custom_domain = ?)`,
              [hostname, `www.${hostname}`]
            );
          } else if (isSubdomain) {
            const sub = hostname.slice(0, -(BASE_DOMAIN.length + 1));
            property = await api.db.queryOne(
              `SELECT * FROM properties WHERE is_active = 1 AND subdomain = ?`,
              [sub]
            );
          }
        }

        // Verify permissions for the resolved tenant property
        if (property) {
          const isMaster = (user as any).role === 'master';
          const isOwner = (property as any).owner_id === user.id;
          let isStaff = false;
          if (!isOwner && !isMaster) {
            const staffRecord = await api.db.queryOne(
              'SELECT 1 FROM property_staff WHERE user_id = ? AND property_id = ?',
              [user.id, (property as any).id]
            );
            isStaff = !!staffRecord;
          }

          if (!isMaster && !isOwner && !isStaff) {
            // If they are not authorized for this tenant property, do not return it
            property = null;
          }
        }

        // Fallback to their owned property if no tenant domain property matches or authorized
        if (!property) {
          property = await api.db.queryOne('SELECT * FROM properties WHERE owner_id = ?', [
            user.id,
          ]);
        }

        // Fallback to their staff property
        if (!property) {
          const staffRecord = await api.db.queryOne(
            'SELECT property_id FROM property_staff WHERE user_id = ?',
            [user.id]
          );
          if (staffRecord) {
            property = await api.db.queryOne('SELECT * FROM properties WHERE id = ?', [
              (staffRecord as any).property_id,
            ]);
          }
        }

        if (!property) return json({ error: 'No associated property found' }, 404);

        return json({
          user: { id: user.id, email: user.email, name: user.name, role: (user as any).role },
          property: {
            id: (property as any).id,
            name: (property as any).name,
            slug: (property as any).slug,
            plan: (property as any).plan || 'basic',
            isActive: (property as any).is_active === 1,
          },
        });
      } catch (err: any) {
        api.logger.error('[Owner Me] Error:', err);
        return json({ error: err.message || 'Failed to fetch profile' }, 500);
      }
    },
  });

  // ── POST /api/owner/upgrade ─────────────────────────────────────────────
  api.registerRoute('/api/owner/upgrade', {
    POST: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) return json({ error: 'Unauthorized' }, 401);

        const body = await req.json().catch(() => null);
        if (!body) return json({ error: 'Invalid JSON body', code: 'VALIDATION_ERROR' }, 400);

        const parsed = upgradeSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: parsed.error.issues,
            },
            400
          );
        }

        const { siteId, newPlan, subdomain, customDomain } = parsed.data;

        const property = (await api.db.queryOne(
          'SELECT id, owner_id, plan, subdomain, custom_domain FROM properties WHERE id = ?',
          [siteId]
        )) as any;

        if (!property) return json({ error: 'Property not found' }, 404);
        if (property.owner_id !== session.user.id) return json({ error: 'Forbidden' }, 403);

        const currentPlan = property.plan;
        if (!planSatisfies(newPlan, currentPlan)) {
          return json(
            {
              error: `Cannot downgrade from "${currentPlan}" to "${newPlan}". Contact support for downgrades.`,
            },
            422
          );
        }
        if (newPlan === currentPlan) {
          return json({ error: 'Site is already on this plan' }, 422);
        }
        if (newPlan === 'premium' && !subdomain) {
          return json({ error: 'subdomain is required when upgrading to premium' }, 400);
        }
        if (newPlan === 'ultimate' && !customDomain) {
          return json({ error: 'customDomain is required when upgrading to ultimate' }, 400);
        }

        if (newPlan === 'premium') {
          await api.db.execute('UPDATE properties SET plan = ?, subdomain = ? WHERE id = ?', [
            'premium',
            subdomain ?? null,
            siteId,
          ]);
        } else if (newPlan === 'ultimate') {
          await api.db.execute(
            'UPDATE properties SET plan = ?, custom_domain = ?, domain_verified = 0 WHERE id = ?',
            ['ultimate', customDomain ?? null, siteId]
          );
        }

        await api.db.execute(
          'UPDATE sites SET plan = ? WHERE slug = (SELECT slug FROM properties WHERE id = ?)',
          [newPlan, siteId]
        );

        api.hooks.doAction('core:site:plan_upgraded', {
          siteId,
          previousPlan: currentPlan,
          newPlan,
          actorId: session.user.id,
          subdomain: subdomain ?? null,
          customDomain: customDomain ?? null,
        });

        return json({
          success: true,
          siteId,
          previousPlan: currentPlan,
          newPlan,
        });
      } catch (err: any) {
        api.logger.error('[Owner Upgrade] Error:', err);
        return json({ error: err.message || 'Upgrade failed' }, 500);
      }
    },
  });

  api.logger.info('owner: ready');
}
