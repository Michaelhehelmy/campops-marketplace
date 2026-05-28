import { NextRequest } from 'next/server';
import { getSqlite } from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcsDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

function generateIcs(propertyName: string, bookings: any[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SinaiCamps//iCal Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:' + escapeIcsText(propertyName),
  ];

  for (const b of bookings) {
    const dtStart = formatIcsDate(b.check_in);
    const dtEnd = formatIcsDate(b.check_out);
    const summary = escapeIcsText(`Booked — ${b.guest_name || 'Guest'}`);
    const uid = `${b.id}@sinaicamps.com`;
    const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    lines.push('BEGIN:VEVENT');
    lines.push('UID:' + uid);
    lines.push('DTSTART;VALUE=DATE:' + dtStart);
    lines.push('DTEND;VALUE=DATE:' + dtEnd);
    lines.push('SUMMARY:' + summary);
    lines.push('STATUS:CONFIRMED');
    lines.push('DTSTAMP:' + now);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { propertyId: string } }
) {
  const { propertyId } = params;

  try {
    const db = getSqlite();

    const property = db
      .prepare('SELECT id, name, slug, is_active FROM properties WHERE id = ? OR slug = ?')
      .get(propertyId, propertyId) as any;

    if (!property || !property.is_active) {
      return new Response('Property not found', { status: 404 });
    }

    const bookings = db
      .prepare(
        `SELECT id, guest_name, check_in, check_out
         FROM plugin_booking_bookings
         WHERE listing_id = ?
           AND status IN ('confirmed', 'checked_in', 'checked_out')
         ORDER BY check_in ASC`
      )
      .all(property.id) as any[];

    logger.info(
      `[iCal Export] Generated feed for property ${property.name} (${property.id}): ${bookings.length} bookings`
    );

    const ics = generateIcs(property.name, bookings);

    return new Response(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${property.slug || property.id}.ics"`,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (err: any) {
    logger.error('[iCal Export] Error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
