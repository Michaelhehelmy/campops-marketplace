import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { housekeepingRouter } from './routes/housekeeping.js';

export default async function init(api: PluginAPI) {
  api.logger.info('Initializing Housekeeping Plugin');

  api.registerRoute('/api/p/housekeeping', housekeepingRouter(api));

  api.hooks.register('reservations.after_checkout', async (data: any) => {
    api.logger.info(`Creating cleaning task for room: ${data.room_id}`);
    const id = crypto.randomUUID();
    await api.db.query(
      `INSERT INTO housekeeping_tasks (id, room_id, category, status, priority, created_at)
       VALUES ($1, $2, 'cleaning', 'pending', 'high', NOW())`,
      [id, data.room_id]
    );
    return data;
  });

  api.logger.info('Housekeeping Plugin initialized successfully');
}
