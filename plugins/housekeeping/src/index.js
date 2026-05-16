import { housekeepingRouter } from './routes/housekeeping.js';
export async function init(api) {
  api.logger.info('Initializing Housekeeping Plugin');
  // Register routes
  api.registerRoute('/api/housekeeping', housekeepingRouter(api));
  // Listen for guest checkout to create cleaning task
  api.hooks.register('reservations.after_checkout', async (data) => {
    api.logger.info(`Creating cleaning task for room: ${data.room_id}`);
    const id = crypto.randomUUID();
    await api.db.query(
      `
      INSERT INTO housekeeping_tasks (id, room_id, category, status, priority, created_at)
      VALUES ($1, $2, 'cleaning', 'pending', 'high', NOW())
    `,
      [id, data.room_id]
    );
    return data;
  });
  api.logger.info('Housekeeping Plugin initialized successfully');
}
