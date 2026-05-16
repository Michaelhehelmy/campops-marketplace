import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { pluginName, enabled } = body;

    if (!pluginName) {
      return NextResponse.json({ error: 'Plugin name is required' }, { status: 400 });
    }

    const existing = await db
      .prepare('SELECT id FROM property_plugins WHERE property_id = ? AND plugin_name = ?')
      .get(id, pluginName);

    if (existing) {
      await db
        .prepare(
          'UPDATE property_plugins SET is_enabled = ? WHERE property_id = ? AND plugin_name = ?'
        )
        .run(enabled ? 1 : 0, id, pluginName);
    } else {
      await db
        .prepare(
          'INSERT INTO property_plugins (id, property_id, plugin_name, is_enabled) VALUES (?, ?, ?, ?)'
        )
        .run('pp_' + Math.random().toString(36).substring(7), id, pluginName, enabled ? 1 : 0);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[Master Plugin API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
