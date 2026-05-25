import type { PluginAPI } from '@sinaicamps/plugin-sdk';

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}

export function hrRouter(api: PluginAPI) {
  return {
    GET: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const url = new URL(req.url);
      const section = url.searchParams.get('section') || 'employees';

      if (section === 'employees') {
        const employees = await api.db.query(
          'SELECT * FROM plugin_hr_core_employees WHERE is_active = 1 ORDER BY department, position'
        );
        return new Response(JSON.stringify({ employees }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'leave') {
        const status = url.searchParams.get('status');
        let sql = 'SELECT * FROM plugin_hr_core_leave_requests WHERE 1=1';
        const params: any[] = [];
        if (status) { sql += ' AND status = ?'; params.push(status); }
        sql += ' ORDER BY requested_at DESC';
        const requests = await api.db.query(sql, params);
        return new Response(JSON.stringify({ requests }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'timesheets') {
        const timesheets = await api.db.query(
          'SELECT * FROM plugin_hr_core_timesheets ORDER BY date DESC LIMIT 50'
        );
        return new Response(JSON.stringify({ timesheets }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },

    POST: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const section = new URL(req.url).searchParams.get('section');

      if (section === 'employees' || !section) {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_hr_core_employees (id, user_id, employee_number, department, position, employment_type, hourly_rate, hire_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, body.user_id || null, body.employee_number || `EMP-${Date.now()}`, body.department, body.position, body.employment_type || 'full_time', body.hourly_rate || 0, body.hire_date || new Date().toISOString().split('T')[0], Date.now(), Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      if (section === 'leave') {
        const id = crypto.randomUUID();
        await api.db.execute(
          `INSERT INTO plugin_hr_core_leave_requests (id, employee_id, leave_type, start_date, end_date, days_requested, reason, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, body.employee_id, body.leave_type, body.start_date, body.end_date, body.days_requested, body.reason || '', Date.now()]
        );
        return new Response(JSON.stringify({ id }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },

    PATCH: async (req: Request) => {
      const session = await api.auth.getSession(req);
      if (!session) return unauthorized();

      const body = await req.json();
      const section = new URL(req.url).searchParams.get('section');
      const id = new URL(req.url).searchParams.get('id');

      if (!id) {
        return new Response(JSON.stringify({ error: 'Missing id' }), { status: 400 });
      }

      if (section === 'leave') {
        await api.db.execute(
          `UPDATE plugin_hr_core_leave_requests SET status = ?, approved_by = ?, approved_at = ? WHERE id = ?`,
          [body.status, session.user.id, Date.now(), id]
        );
        return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      return new Response(JSON.stringify({ error: 'Unknown section' }), { status: 400 });
    },
  };
}
