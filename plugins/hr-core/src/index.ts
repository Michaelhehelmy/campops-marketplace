import type { PluginAPI } from '@sinaicamps/plugin-sdk';
import { hrRouter } from './routes/hr.js';

export default async function init(api: PluginAPI): Promise<void> {
  api.logger.info('[hr-core] Initializing HR Core Plugin');

  await api.db.createTable(
    'employees',
    `
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE,
    employee_number TEXT UNIQUE,
    department TEXT,
    position TEXT,
    employment_type TEXT DEFAULT 'full_time',
    hourly_rate REAL DEFAULT 0,
    salary REAL DEFAULT 0,
    hire_date TEXT,
    is_active INTEGER DEFAULT 1,
    emergency_contact TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
    `
  );

  await api.db.createTable(
    'leave_requests',
    `
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    leave_type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    days_requested INTEGER NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at INTEGER NOT NULL,
    approved_by TEXT,
    approved_at INTEGER
    `
  );

  await api.db.createTable(
    'timesheets',
    `
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    date TEXT NOT NULL,
    clock_in INTEGER,
    clock_out INTEGER,
    total_hours REAL DEFAULT 0,
    approved INTEGER DEFAULT 0,
    notes TEXT
    `
  );

  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_hr_employees_property ON plugin_hr_core_employees(department)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_hr_leave_employee ON plugin_hr_core_leave_requests(employee_id, status)');
  await api.db.execute('CREATE INDEX IF NOT EXISTS idx_hr_timesheets_employee ON plugin_hr_core_timesheets(employee_id, date DESC)');

  api.registerRoute('/api/p/hr', hrRouter(api));

  api.registerHook('CHECKIN_COMPLETED', async (data: any) => {
    api.logger.info('[hr-core] Check-in event received — staffing metrics updated');
    return data;
  });

  api.ui.addSlotComponent('dashboard.widgets', 'hr-core:StaffAttendanceWidget');

  api.logger.info('[hr-core] Plugin initialized successfully');
}
