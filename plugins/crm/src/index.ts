import type { PluginAPI } from '@sinaicamps/plugin-sdk';

/**
 * CRM Plugin Entry Point
 * ──────────────────────
 * Manages guest activity and listens to ecosystem events.
 */
export default async function init(api: PluginAPI) {
  api.logger.info('Initializing CRM Plugin...');

  // 1. Create database tables
  await api.db.createTable(
    'activities',
    `
    guest_email TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    details TEXT,
    severity TEXT DEFAULT 'info',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  `
  );

  // 2. Register UI components
  api.ui.addSlotComponent('guest.dashboard.bottom', 'crm:ActivityWidget');
  api.ui.addSettingsPage({
    id: 'crm-history',
    label: 'Guest History',
    component: 'crm:GuestHistory',
  });

  // 3. Listen for BOOKING_CREATED hook
  api.registerHook('BOOKING_CREATED', async (data: any) => {
    api.logger.info(`Reacting to booking for ${data.guestEmail}`);

    await api.db.execute(
      `
      INSERT INTO plugin_crm_activities (guest_email, activity_type, details)
      VALUES (?, ?, ?)
    `,
      [
        data.guestEmail || data.guestName,
        'BOOKING_CREATED',
        `New booking created with total $${data.totalPrice}`,
      ]
    );

    return data;
  });

  api.registerRoute('/api/p/crm/activities', {
    GET: async (req: Request) => {
      try {
        const session = await api.auth.getSession(req);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const url = new URL(req.url);
        const guestEmail = url.searchParams.get('guest_email');

        let activities;
        if (session.user.role === 'guest') {
          // Guests can only see their own activities
          activities = await api.db.query(
            'SELECT * FROM plugin_crm_activities WHERE guest_email = ? ORDER BY created_at DESC',
            [session.user.email]
          );
        } else if (guestEmail) {
          activities = await api.db.query(
            'SELECT * FROM plugin_crm_activities WHERE guest_email = ? ORDER BY created_at DESC',
            [guestEmail]
          );
        } else {
          activities = await api.db.query(
            'SELECT * FROM plugin_crm_activities ORDER BY created_at DESC'
          );
        }

        return new Response(JSON.stringify({ activities }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
      }
    },
  });

  return {
    async getActivities(guestEmail?: string) {
      if (guestEmail) {
        return api.db.query(
          'SELECT * FROM plugin_crm_activities WHERE guest_email = ? ORDER BY created_at DESC',
          [guestEmail]
        );
      }
      return api.db.query('SELECT * FROM plugin_crm_activities ORDER BY created_at DESC');
    },
  };
}
