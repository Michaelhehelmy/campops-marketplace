import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from '../route';
import { db } from '@/lib/db';
import { NextRequest } from 'next/server';

vi.mock('@/lib/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'dev-user-1', role: 'owner' },
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

function req(body?: any) {
  return new NextRequest('http://localhost/api/plugins/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  } as any);
}

const validManifest = { name: 'My Plugin', description: 'Does things' };

describe('POST /api/plugins/submit', () => {
  beforeEach(() => db.resetMockStore());

  it('returns 401 without session', async () => {
    const { auth } = await import('@/lib/auth');
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const res = await POST(
      req({ pluginId: 'acme/foo', version: '1.0.0', manifest: validManifest })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when pluginId missing', async () => {
    const res = await POST(req({ version: '1.0.0', manifest: validManifest }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    const paths = data.details.map((d: any) => d.path.join('.'));
    expect(paths).toContain('pluginId');
  });

  it('returns 400 when version missing', async () => {
    const res = await POST(req({ pluginId: 'acme/foo', manifest: validManifest }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    const paths = data.details.map((d: any) => d.path.join('.'));
    expect(paths).toContain('version');
  });

  it('returns 400 when manifest is not an object', async () => {
    const res = await POST(req({ pluginId: 'acme/foo', version: '1.0.0', manifest: 'bad' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    const paths = data.details.map((d: any) => d.path.join('.'));
    expect(paths).toContain('manifest');
  });

  it('returns 400 when manifest missing name', async () => {
    const res = await POST(
      req({ pluginId: 'acme/foo', version: '1.0.0', manifest: { description: 'x' } })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    const paths = data.details.map((d: any) => d.path.join('.'));
    expect(paths).toContain('manifest.name');
  });

  it('returns 400 when manifest missing description', async () => {
    const res = await POST(
      req({ pluginId: 'acme/foo', version: '1.0.0', manifest: { name: 'x' } })
    );
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Validation failed');
    const paths = data.details.map((d: any) => d.path.join('.'));
    expect(paths).toContain('manifest.description');
  });

  it('creates submission with status=pending and returns 201', async () => {
    const res = await POST(
      req({
        pluginId: 'acme/my-plugin',
        version: '1.2.3',
        manifest: validManifest,
        zipUrl: 'https://example.com/plugin.zip',
      })
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.submission.pluginId).toBe('acme/my-plugin');
    expect(data.submission.version).toBe('1.2.3');
    expect(data.submission.status).toBe('pending');
    expect(data.submission.id).toBeTruthy();

    const row = db
      .prepare('SELECT * FROM plugin_submissions WHERE id = ?')
      .get(data.submission.id) as any;
    expect(row.status).toBe('pending');
    expect(row.submitted_by).toBe('dev-user-1');
    const mf = typeof row.manifest === 'string' ? JSON.parse(row.manifest) : row.manifest;
    expect(mf.name).toBe('My Plugin');
  });

  it('fires CORE_PLUGIN_SUBMITTED action', async () => {
    const { hookManager } = await import('@/lib/hooks');
    await POST(req({ pluginId: 'acme/test', version: '0.1.0', manifest: validManifest }));
    expect(hookManager.doAction).toHaveBeenCalledWith(
      'core:plugin:submitted',
      expect.objectContaining({ plugin_id: 'acme/test' })
    );
  });

  it('returns 409 for duplicate pending submission', async () => {
    await POST(req({ pluginId: 'acme/dup', version: '1.0.0', manifest: validManifest }));
    const res2 = await POST(
      req({ pluginId: 'acme/dup', version: '1.0.0', manifest: validManifest })
    );
    expect(res2.status).toBe(409);
    expect((await res2.json()).error).toMatch(/pending or approved/i);
  });

  it('allows resubmission with different version', async () => {
    await POST(req({ pluginId: 'acme/versioned', version: '1.0.0', manifest: validManifest }));
    const res2 = await POST(
      req({ pluginId: 'acme/versioned', version: '2.0.0', manifest: validManifest })
    );
    expect(res2.status).toBe(201);
  });

  it('allows resubmission after rejection', async () => {
    const res1 = await POST(
      req({ pluginId: 'acme/retry', version: '1.0.0', manifest: validManifest })
    );
    const { submission } = await res1.json();
    db.prepare(`UPDATE plugin_submissions SET status = 'rejected' WHERE id = ?`).run(submission.id);

    const res2 = await POST(
      req({ pluginId: 'acme/retry', version: '1.0.0', manifest: validManifest })
    );
    expect(res2.status).toBe(201);
  });
});
