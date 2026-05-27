import { errorResponse } from '@/lib/errors';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  const { slug } = params;
  const { searchParams } = req.nextUrl;
  const checkIn = searchParams.get('checkIn');
  const checkOut = searchParams.get('checkOut');

  try {
    const property = await db
      .prepare(
        `
      SELECT * FROM properties WHERE slug = ? OR id = ?
    `
      )
      .get(slug, slug);

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 });
    }

    // Get room types for this property
    const room_types = await db
      .prepare(
        `
      SELECT * FROM room_types WHERE property_id = ?
    `
      )
      .all(property.id);

    logger.info('[Public Property API] Property:', property.id, property.slug);
    logger.info('[Public Property API] Room types:', room_types);

    // Mock availability
    const availability = room_types.map((rt: any) => ({
      room_type_id: rt.id,
      available: 5,
      price: rt.base_price,
    }));

    return NextResponse.json({
      property,
      room_types,
      availability,
    });
  } catch (err: any) {
    logger.error('[Public Property API] Error:', err);
    return errorResponse(err);
  }
}
