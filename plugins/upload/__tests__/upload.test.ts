import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index';
import { registerRoutes } from '../src/api/routes';

function createMockPluginAPI() {
  return {
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    db: {
      createTable: vi.fn().mockResolvedValue(undefined),
      query: vi.fn().mockResolvedValue([]),
      queryOne: vi.fn().mockResolvedValue(null),
      execute: vi.fn().mockResolvedValue(undefined),
    },
    ui: {
      addSlotComponent: vi.fn(),
      addSettingsPage: vi.fn(),
    },
    registerHook: vi.fn().mockReturnValue(() => {}),
    executeHook: vi.fn().mockResolvedValue({}),
    registerRoute: vi.fn(),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        user: { id: 'user-1', email: 'guest@test.com', role: 'guest' },
      }),
    },
  };
}

describe('Upload Plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates tables for files and booking attachments', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.db.createTable).toHaveBeenCalledWith('files', expect.any(String));
    expect(api.db.createTable).toHaveBeenCalledWith('booking_attachments', expect.any(String));
  });

  it('registers routes', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    expect(api.registerRoute).toHaveBeenCalled();
  });

  it('registers file storage indexes', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const indexCalls = (api.db.execute as any).mock.calls.map((c: any) => c[0]);
    expect(indexCalls.some((sql: string) => sql.includes('idx_upload_files_uploaded_by'))).toBe(true);
    expect(indexCalls.some((sql: string) => sql.includes('idx_upload_files_purpose'))).toBe(true);
    expect(indexCalls.some((sql: string) => sql.includes('idx_upload_booking_att_booking'))).toBe(true);
    expect(indexCalls.some((sql: string) => sql.includes('idx_upload_booking_att_file'))).toBe(true);
  });

  it('returns file metadata on GET /api/p/upload/:id', async () => {
    const api = createMockPluginAPI();
    await init(api as any);

    const mockFile = {
      id: 'file_abc123',
      original_name: 'photo.jpg',
      mime_type: 'image/jpeg',
      size: 1024,
      purpose: 'avatar',
      uploaded_by: 'user-1',
      created_at: Date.now(),
    };
    api.db.queryOne = vi.fn().mockResolvedValue(mockFile);

    const routesApi = createMockPluginAPI();
    routesApi.auth = api.auth;
    routesApi.db = api.db;
    routesApi.logger = api.logger;
    registerRoutes(routesApi as any);

    const handler = findRouteHandler(routesApi, '/api/p/upload/:id', 'GET');
    const req = new Request('http://localhost/api/p/upload/file_abc123');
    const res = await handler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.id).toBe('file_abc123');
    expect(body.originalName).toBe('photo.jpg');
    expect(body.mimeType).toBe('image/jpeg');
  });

  it('returns 404 for non-existent file metadata', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/:id', 'GET');
    const req = new Request('http://localhost/api/p/upload/nonexistent');
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('File not found');
  });

  it('rejects upload without auth', async () => {
    const api = createMockPluginAPI();
    api.auth.getSession = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const routeCalls = (api.registerRoute as any).mock.calls;
    const handler = routeCalls.find((c: any) => c[0] === '/api/p/upload')[1].POST;
    const req = new Request('http://localhost/api/p/upload', { method: 'POST' });
    const res = await handler(req);

    expect(res.status).toBe(401);
  });

  it('rejects upload with non-multipart body', async () => {
    const api = createMockPluginAPI();
    registerRoutes(api as any);

    const routeCalls = (api.registerRoute as any).mock.calls;
    const handler = routeCalls.find((c: any) => c[0] === '/api/p/upload')[1].POST;
    const req = new Request('http://localhost/api/p/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const res = await handler(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('multipart/form-data');
  });

  function findRouteHandler(api: any, path: string, method: string): Function {
    const routeCalls = (api.registerRoute as any).mock.calls;
    const entry = routeCalls.find((c: any) => c[0] === path && c[1]?.[method]);
    return entry[1][method];
  }

  it('deletes file (owner only)', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'file_abc',
      storage_path: 'test.txt',
      uploaded_by: 'user-1',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/:id', 'DELETE');
    const req = new Request('http://localhost/api/p/upload/file_abc', { method: 'DELETE' });
    const res = await handler(req);

    expect(res.status).toBe(200);
    expect(api.db.execute).toHaveBeenCalledWith(
      'DELETE FROM plugin_upload_files WHERE id = ?',
      ['file_abc']
    );
  });

  it('rejects delete by non-owner non-admin', async () => {
    const api = createMockPluginAPI();
    api.auth.getSession = vi.fn().mockResolvedValue({
      user: { id: 'user-2', role: 'guest' },
    });
    api.db.queryOne = vi.fn().mockResolvedValue({
      id: 'file_abc',
      storage_path: 'test.txt',
      uploaded_by: 'user-1',
    });
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/:id', 'DELETE');
    const req = new Request('http://localhost/api/p/upload/file_abc', { method: 'DELETE' });
    const res = await handler(req);

    expect(res.status).toBe(403);
  });

  it('rejects booking attachment upload when booking not found', async () => {
    const api = createMockPluginAPI();
    api.db.queryOne = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/booking/:bookingId', 'POST');
    const req = new Request('http://localhost/api/p/upload/booking/bad-id', { method: 'POST' });
    const res = await handler(req);

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Booking not found');
  });

  it('lists booking attachments', async () => {
    const api = createMockPluginAPI();
    api.db.query = vi.fn().mockResolvedValue([
      {
        attachment_id: 'att_1',
        file_id: 'file_1',
        original_name: 'receipt.pdf',
        mime_type: 'application/pdf',
        size: 2048,
        attached_at: Date.now(),
        created_at: Date.now(),
      },
    ]);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/booking/:bookingId', 'GET');
    const req = new Request('http://localhost/api/p/upload/booking/bk-1');
    const res = await handler(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attachments).toHaveLength(1);
    expect(body.attachments[0].originalName).toBe('receipt.pdf');
  });

  it('rejects booking attachment upload without auth', async () => {
    const api = createMockPluginAPI();
    api.auth.getSession = vi.fn().mockResolvedValue(null);
    registerRoutes(api as any);

    const handler = findRouteHandler(api, '/api/p/upload/booking/:bookingId', 'POST');
    const req = new Request('http://localhost/api/p/upload/booking/bk-1', { method: 'POST' });
    const res = await handler(req);

    expect(res.status).toBe(401);
  });

  it('initializes successfully and returns void', async () => {
    const api = createMockPluginAPI();
    const result = await init(api as any);
    expect(result).toBeUndefined();
  });
});
