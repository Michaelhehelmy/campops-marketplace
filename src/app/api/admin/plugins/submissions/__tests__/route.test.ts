import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, PATCH } from '../route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'master-user', role: 'master' },
      }),
    },
  },
}));

vi.mock('@/lib/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/hooks')>();
  return {
    ...actual,
    hookManager: {
      doAction: vi.fn().mockResolvedValue(undefined),
      applyFilters: vi.fn().mockImplementation((_h: string, v: any) => v),
    },
  };
});

function req(url: string, init?: RequestInit) {
  return new NextRequest(url, init as any);
}

function seedSubmission(
  overrides: Partial<{
    pluginId: string;
    version: string;
    status: string;
    submittedBy: string;
  }> = {}
) {
  const id = uuidv4();
  const now = Math.floor(Date.now() / 1000);
  const manifest = JSON.stringify({ name: 'Test Plugin', description: 'A test plugin' });
  db.prepare(
    `INSERT INTO plugin_submissions (id, plugin_id, submitted_by, version, manifest, status, submitted_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    overrides.pluginId ?? 'test/plugin',
    overrides.submittedBy ?? 'dev-user-1',
    overrides.version ?? '1.0.0',
    manifest,
    overrides.status ?? 'pending',
    now
  );
  return id;
}

describe('GET /api/admin/plugins/submissions', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 when not master', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce({
      user: { id: 'regular-user', role: 'owner' },
    });
    const res = await GET(req('http://localhost/api/admin/plugins/submissions'));
    expect(res.status).toBe(401);
  });

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await GET(req('http://localhost/api/admin/plugins/submissions'));
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status filter', async () => {
    const res = await GET(req('http://localhost/api/admin/plugins/submissions?status=bogus'));
    expect(res.status).toBe(400);
  });

  it('returns all submissions when no filter', async () => {
    seedSubmission({ status: 'pending' });
    seedSubmission({ status: 'approved' });
    const res = await GET(req('http://localhost/api/admin/plugins/submissions'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.total).toBe(2);
    expect(data.submissions).toHaveLength(2);
  });

  it('filters by status=pending', async () => {
    seedSubmission({ status: 'pending' });
    seedSubmission({ status: 'approved' });
    seedSubmission({ status: 'rejected' });
    const res = await GET(req('http://localhost/api/admin/plugins/submissions?status=pending'));
    const data = await res.json();
    expect(data.total).toBe(1);
    expect(data.submissions[0].status).toBe('pending');
  });

  it('includes parsed manifest in response', async () => {
    seedSubmission({ pluginId: 'acme/manifested' });
    const res = await GET(req('http://localhost/api/admin/plugins/submissions'));
    const data = await res.json();
    expect(data.submissions[0].manifest.name).toBe('Test Plugin');
  });

  it('respects limit and skip', async () => {
    for (let i = 0; i < 5; i++) seedSubmission({ pluginId: `acme/plugin-${i}` });
    const res = await GET(req('http://localhost/api/admin/plugins/submissions?limit=2&skip=2'));
    const data = await res.json();
    expect(data.submissions).toHaveLength(2);
    expect(data.total).toBe(5);
  });
});

describe('PATCH /api/admin/plugins/submissions', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 for non-master', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce({
      user: { id: 'owner', role: 'owner' },
    });
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'x', action: 'approve' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when id missing', async () => {
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve' }),
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid action', async () => {
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'x', action: 'delete' }),
      })
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('returns 404 for missing submission', async () => {
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'does-not-exist', action: 'reject' }),
      })
    );
    expect(res.status).toBe(404);
  });

  it('rejects a pending submission', async () => {
    const id = seedSubmission();
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'reject', reviewNotes: 'Missing docs' }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission.status).toBe('rejected');
    expect(data.submission.reviewNotes).toBe('Missing docs');

    const row = db.prepare('SELECT status FROM plugin_submissions WHERE id = ?').get(id) as any;
    expect(row.status).toBe('rejected');
  });

  it('approves a pending submission and creates available_plugin', async () => {
    const id = seedSubmission({ pluginId: 'acme/approved-plugin', version: '2.0.0' });
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'approve', reviewNotes: 'LGTM' }),
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.submission.status).toBe('approved');

    const plugin = db
      .prepare('SELECT * FROM available_plugins WHERE name = ?')
      .get('acme/approved-plugin') as any;
    expect(plugin).not.toBeNull();
    expect(plugin.version).toBe('2.0.0');
    expect(plugin.is_active).toBeTruthy();
  });

  it('updates existing available_plugin on re-approval', async () => {
    db.prepare(
      `INSERT INTO available_plugins (name, display_name, is_active, is_official, version, updated_at)
       VALUES ('acme/existing', 'Old Name', 1, 0, '1.0.0', ?)`
    ).run(Math.floor(Date.now() / 1000));

    const id = seedSubmission({ pluginId: 'acme/existing', version: '1.5.0' });
    await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'approve' }),
      })
    );

    const plugin = db
      .prepare('SELECT version FROM available_plugins WHERE name = ?')
      .get('acme/existing') as any;
    expect(plugin.version).toBe('1.5.0');
  });

  it('fires CORE_PLUGIN_ACTIVATED on approval', async () => {
    const { hookManager } = await import('@/lib/hooks');
    const id = seedSubmission({ pluginId: 'acme/fired' });
    await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'approve' }),
      })
    );
    expect(hookManager.doAction).toHaveBeenCalledWith(
      'core:plugin:activated',
      expect.objectContaining({ pluginId: 'acme/fired' })
    );
  });

  it('does not fire hook on rejection', async () => {
    const { hookManager } = await import('@/lib/hooks');
    vi.clearAllMocks();
    const id = seedSubmission();
    await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'reject' }),
      })
    );
    expect(hookManager.doAction).not.toHaveBeenCalled();
  });

  it('returns 409 when trying to review an already-approved submission', async () => {
    const id = seedSubmission({ status: 'approved' });
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'reject' }),
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already approved/i);
  });

  it('returns 409 when trying to review an already-rejected submission', async () => {
    const id = seedSubmission({ status: 'rejected' });
    const res = await PATCH(
      req('http://localhost/api/admin/plugins/submissions', {
        method: 'PATCH',
        body: JSON.stringify({ id, action: 'approve' }),
      })
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/already rejected/i);
  });
});
