import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/PluginRuntimeService', () => ({
  PluginRuntimeService: { init: vi.fn().mockResolvedValue(undefined) },
}));

const mockGet = vi.fn();
vi.mock('@/lib/PluginRouteRegistry', () => ({
  pluginRouteRegistry: { get: mockGet },
}));

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

async function importHandlers() {
  const mod = await import('../[...plugin]/route');
  return mod;
}

describe('Plugin catch-all route /api/p/[...plugin]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 404 JSON when no plugin handler registered', async () => {
    mockGet.mockReturnValue(null);
    const { GET } = await importHandlers();
    const req = new NextRequest('http://localhost/api/p/unknown/route');
    const res = await GET(req, { params: { plugin: ['unknown', 'route'] } });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.code).toBe('NOT_FOUND');
  });

  it('delegates GET to registered plugin handler', async () => {
    const mockHandler = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    mockGet.mockReturnValue({ handler: { handler: mockHandler }, params: {} });
    const { GET } = await importHandlers();
    const req = new NextRequest('http://localhost/api/p/booking/rooms');
    const res = await GET(req, { params: { plugin: ['booking', 'rooms'] } });
    expect(res.status).toBe(200);
    expect(mockHandler).toHaveBeenCalledOnce();
  });

  it('delegates POST to registered plugin handler', async () => {
    const mockHandler = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ created: true }), { status: 201 }));
    mockGet.mockReturnValue({ handler: { handler: mockHandler }, params: {} });
    const { POST } = await importHandlers();
    const req = new NextRequest('http://localhost/api/p/booking/bookings', {
      method: 'POST',
      body: JSON.stringify({ roomId: 'r1' }),
    });
    const res = await POST(req, { params: { plugin: ['booking', 'bookings'] } });
    expect(res.status).toBe(201);
  });

  it('returns 500 error envelope when handler throws', async () => {
    const mockHandler = vi.fn().mockRejectedValue(new Error('Plugin crashed'));
    mockGet.mockReturnValue({ handler: { handler: mockHandler }, params: {} });
    const { GET } = await importHandlers();
    const req = new NextRequest('http://localhost/api/p/booking/crash');
    const res = await GET(req, { params: { plugin: ['booking', 'crash'] } });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('Plugin crashed');
  });

  it('passes dynamic params through and calls handler once', async () => {
    const mockHandler = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    mockGet.mockReturnValue({
      handler: { handler: mockHandler },
      params: { id: 'room-42' },
    });
    const { GET } = await importHandlers();
    const request = new NextRequest('http://localhost/api/p/booking/rooms/room-42');
    const res = await GET(request, { params: { plugin: ['booking', 'rooms', 'room-42'] } });
    expect(mockHandler).toHaveBeenCalledOnce();
    expect(res.status).toBe(200);
  });
});
