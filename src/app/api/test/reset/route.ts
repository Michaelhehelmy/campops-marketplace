import { errorResponse } from '@/lib/errors';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    db.resetMockStore();
    // Re-initialize plugins to ensure tables are created
    const { PluginRuntimeService } = await import('@/lib/PluginRuntimeService');
    PluginRuntimeService.clearCache();
    await PluginRuntimeService.init();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return errorResponse(err);
  }
}
