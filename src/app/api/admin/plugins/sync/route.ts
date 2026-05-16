import { NextRequest, NextResponse } from 'next/server';
import { PluginDiscoveryService } from '@/lib/PluginDiscoveryService';

/**
 * POST /api/admin/plugins/sync
 *
 * Manually triggers a synchronisation between the filesystem and the
 * available_plugins table.
 */
export async function POST(req: NextRequest) {
  try {
    await PluginDiscoveryService.syncPlugins();
    return NextResponse.json({ success: true, message: 'Plugins synchronised successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
