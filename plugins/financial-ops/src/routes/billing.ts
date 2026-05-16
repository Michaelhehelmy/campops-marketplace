import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const billingRouter = (api: PluginAPI) => {
  const app = new Hono();

  // Get folio details
  app.get('/folios/:id', async (c) => {
    const id = c.req.param('id');
    const folio = await api.db.queryOne('SELECT * FROM guest_folios WHERE id = $1', [id]);
    if (!folio) return c.json({ error: 'Folio not found' }, 404);

    const charges = await api.db.query('SELECT * FROM folio_charges WHERE folio_id = $1', [id]);
    const payments = await api.db.query('SELECT * FROM payments WHERE folio_id = $1', [id]);

    return c.json({ data: { ...folio, charges, payments } });
  });

  // Record payment
  app.post('/payments', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `
      INSERT INTO payments (id, folio_id, amount, method, status, created_at)
      VALUES ($1, $2, $3, $4, 'completed', NOW())
    `,
      [id, body.folio_id, body.amount, body.method]
    );

    // Update folio balance
    await api.db.execute(
      `
      UPDATE guest_folios 
      SET total_amount = total_amount - $1, updated_at = NOW() 
      WHERE id = $2
    `,
      [body.amount, body.folio_id]
    );

    return c.json({ success: true, id }, 201);
  });

  return app;
};
