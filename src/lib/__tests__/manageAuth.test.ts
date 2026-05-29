import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextResponse } from 'next/server';
import { requireManageAuth } from '../manageAuth';
import * as auth from '../auth';

describe('manageAuth', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns session when authenticated', async () => {
    const session = { user: { id: 'u1', role: 'manager' }, session: { id: 's1' } };
    vi.spyOn(auth.auth.api, 'getSession').mockResolvedValue(session as any);
    const req = new Request('http://localhost/manage/listing-1');
    const result = await requireManageAuth(req);
    expect(result.error).toBeNull();
    expect(result.session).toEqual(session);
  });

  it('returns 401 when not authenticated', async () => {
    vi.spyOn(auth.auth.api, 'getSession').mockResolvedValue(null);
    const req = new Request('http://localhost/manage/listing-1');
    const result = await requireManageAuth(req);
    expect(result.session).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect(result.error!.status).toBe(401);
    const body = await result.error!.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('handles NextRequest input', async () => {
    const session = { user: { id: 'u1', role: 'manager' }, session: { id: 's1' } };
    vi.spyOn(auth.auth.api, 'getSession').mockResolvedValue(session as any);
    const { NextRequest } = await import('next/server');
    const req = new NextRequest('http://localhost/manage/listing-1');
    const result = await requireManageAuth(req);
    expect(result.error).toBeNull();
  });
});
