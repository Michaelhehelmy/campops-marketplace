import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const destination = searchParams.get('destination');
    const checkIn = searchParams.get('checkIn');
    const checkOut = searchParams.get('checkOut');

    let query = 'SELECT * FROM properties WHERE is_active = 1';
    const params: any[] = [];

    if (destination) {
      query += ' AND (name LIKE $1 OR city LIKE $1 OR country LIKE $1)';
      params.push(`%${destination}%`);
    }

    console.log(`[API Search] Running query: ${query} with params:`, params);
    const properties = await db.prepare(query).all(...params);
    console.log(`[API Search] Found ${properties.length} properties`);

    const enhancedProperties = properties.map((p: any) => ({
      ...p,
      displayMinPrice: p.min_price_per_night || 100,
      displayCurrency: p.currency_code || 'USD',
      availableRoomTypes: [
        {
          id: `rt-${p.id}-1`,
          name: 'Standard Tent',
          price: p.min_price_per_night || 100,
          displayPrice: p.min_price_per_night || 100,
          displayCurrency: p.currency_code || 'USD',
          capacity: 2,
          remaining: 5,
        },
      ],
    }));

    return NextResponse.json({
      properties: enhancedProperties,
      totalCount: enhancedProperties.length,
      checkIn,
      checkOut,
      nights: 5, // Mock nights calculation
    });
  } catch (err: any) {
    console.error('[Public Search API] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
