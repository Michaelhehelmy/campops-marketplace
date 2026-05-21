import { NextRequest, NextResponse } from 'next/server';
import { PluginDiscoveryService } from '@/lib/PluginDiscoveryService';
import { requireRole, isErrorResponse } from '@/lib/auth-middleware';
import { AuditService } from '@/lib/audit';

/**
 * POST /api/admin/plugins/sync
 *
 * Manually triggers a synchronisation between the filesystem and the
 * available_plugins table.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireRole(req, ['marketplace_master']);
    if (isErrorResponse(session)) return session;
    await PluginDiscoveryService.syncPlugins();
    AuditService.log({
      userId: session.user.id,
      action: 'plugins.sync',
      resource: 'available_plugins',
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });
    return NextResponse.json({ success: true, message: 'Plugins synchronised successfully' });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
