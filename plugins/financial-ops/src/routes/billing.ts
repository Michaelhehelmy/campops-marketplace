import { Hono } from 'hono';
import { PluginAPI } from '../../../../packages/plugin-sdk/src/types.js';

export const billingRouter = (api: PluginAPI) => {
  const app = new Hono();

  app.get('/folios/:id', async (c) => {
    const id = c.req.param('id');
    const folio = await api.db.queryOne('SELECT * FROM plugin_folios WHERE id = ?', [id]);
    if (!folio) return c.json({ error: 'Folio not found' }, 404);

    const charges = await api.db.query('SELECT * FROM plugin_folio_charges WHERE folio_id = ?', [id]);
    const payments = await api.db.query('SELECT * FROM plugin_payments WHERE folio_id = ?', [id]);

    return c.json({ data: { ...folio, charges, payments } });
  });

  app.post('/payments', async (c) => {
    const body = await c.req.json();
    const id = crypto.randomUUID();

    await api.db.execute(
      `INSERT INTO plugin_payments (id, folio_id, amount, method, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?)`,
      [id, body.folio_id, body.amount, body.method, Date.now()]
    );

    await api.db.execute(
      `UPDATE plugin_folios SET total_amount = total_amount - ?, updated_at = ? WHERE id = ?`,
      [body.amount, Date.now(), body.folio_id]
    );

    return c.json({ success: true, id }, 201);
  });

  return app;
};
