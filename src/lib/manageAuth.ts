import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

/**
 * Require an authenticated session for /api/manage/* and /api/site/* routes.
 *
 * Usage:
 *   const guard = await requireManageAuth(req);
 *   if (guard.error) return guard.error;
 *   const { session } = guard;
 */
export async function requireManageAuth(
  req: Request | NextRequest
): Promise<
  | { error: NextResponse; session: null }
  | { error: null; session: Awaited<ReturnType<typeof auth.api.getSession>> }
> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
      session: null,
    };
  }
  return { error: null, session };
}
