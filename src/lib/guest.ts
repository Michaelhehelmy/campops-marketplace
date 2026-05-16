import { db } from './db';

export async function checkGuestAccess(userId: string, propertyId: string): Promise<boolean> {
  // Check if guest has an active reservation for this property
  // Active = check_in <= now AND check_out >= now
  const reservation = await db
    .prepare(
      `
    SELECT id FROM reservations
    WHERE guest_id = (SELECT id FROM guests WHERE user_id = ?)
      AND room_id IN (SELECT id FROM rooms WHERE property_id = ?)
      AND status = 'confirmed'
      AND check_in <= CURRENT_TIMESTAMP
      AND check_out >= CURRENT_TIMESTAMP
  `
    )
    .get(userId, propertyId);

  return !!reservation;
}

export async function getGuestReservations(userId: string) {
  return await db
    .prepare(
      `
    SELECT r.*, p.name as property_name, p.slug as property_slug
    FROM reservations r
    JOIN rooms rm ON rm.id = r.room_id
    JOIN properties p ON p.id = rm.property_id
    WHERE r.guest_id = (SELECT id FROM guests WHERE user_id = ?)
    ORDER BY r.check_in DESC
  `
    )
    .all(userId);
}
