import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    db.resetMockStore();
    // Re-initialize plugins to ensure tables are created
    const { PluginRuntimeService } = await import('@/lib/PluginRuntimeService');
    PluginRuntimeService.clearCache();
    await PluginRuntimeService.init();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
