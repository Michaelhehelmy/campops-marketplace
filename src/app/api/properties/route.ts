import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const ownerId = req.nextUrl.searchParams.get('ownerId');

  if (!ownerId) {
    return NextResponse.json({ error: 'ownerId is required' }, { status: 400 });
  }

  try {
    const properties = await db
      .prepare(
        `
      SELECT p.*, u.email as owner_email
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      WHERE p.owner_id = $1
      ORDER BY p.created_at DESC
    `
      )
      .all(ownerId);

    return NextResponse.json({ properties });
  } catch (err: any) {
    logger.error('[Properties API] Error:', err);
    return errorResponse(err);
  }
}
