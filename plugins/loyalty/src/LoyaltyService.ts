/**
 * LoyaltyService
 * ──────────────
 * Logic for calculating points, awarding/redeeming points, and tier management.
 * Moved from core to plugin to maintain decoupling.
 */

export class LoyaltyService {
  /**
   * Calculates points earned based on transaction amount and guest status.
   */
  static calculateEarnedPoints(
    amountUsd: number,
    exchangeRate: number,
    earnPercent: number,
    vipLevel: string,
    vipMultiplier: number
  ): number {
    const basePoints = amountUsd * exchangeRate * (earnPercent / 100);
    const multiplier = vipLevel && vipLevel !== 'regular' ? vipMultiplier : 1;
    return Math.floor(basePoints * multiplier);
  }

  /**
   * Records a point award and updates the guest's balance.
   */
  static async awardPoints(
    db: any,
    guestId: string,
    points: number,
    referenceId?: string,
    notes?: string
  ): Promise<void> {
    await db.execute(
      `INSERT INTO point_transactions (guest_id, amount, type, reference_id, notes)
       VALUES (?, ?, 'award', ?, ?)`,
      [guestId, points, referenceId, notes]
    );

    await db.execute(`UPDATE guests SET loyalty_points = loyalty_points + ? WHERE id = ?`, [
      points,
      guestId,
    ]);
  }

  /**
   * Records a point redemption and updates the guest's balance.
   */
  static async redeemPoints(
    db: any,
    guestId: string,
    points: number,
    referenceId?: string,
    notes?: string
  ): Promise<void> {
    await db.execute(
      `INSERT INTO point_transactions (guest_id, amount, type, reference_id, notes)
       VALUES (?, ?, 'redemption', ?, ?)`,
      [guestId, -points, referenceId, notes]
    );

    await db.execute(`UPDATE guests SET loyalty_points = loyalty_points - ? WHERE id = ?`, [
      points,
      guestId,
    ]);
  }

  /**
   * Evaluates guest spend/points to determine if a tier upgrade is warranted.
   */
  static async checkAndUpgradeTier(db: any, guestId: string): Promise<void> {
    const guest = await db.queryOne(
      'SELECT loyalty_points, vip_level, total_spend_usd FROM guests WHERE id = ?',
      [guestId]
    );

    if (!guest) return;

    let newLevel = guest.vip_level || 'regular';
    const points = parseInt(guest.loyalty_points || '0');
    const spend = parseFloat(guest.total_spend_usd || '0');

    // Tier Logic:
    // Regular: 0-1999 pts
    // Silver: 2000-9999 pts OR $500 spend
    // Gold: 10000-49999 pts OR $2500 spend
    // Platinum: 50000+ pts OR $10000 spend

    if (points >= 50000 || spend >= 10000) newLevel = 'platinum';
    else if (points >= 10000 || spend >= 2500) newLevel = 'gold';
    else if (points >= 2000 || spend >= 500) newLevel = 'silver';
    else newLevel = 'regular';

    if (newLevel !== guest.vip_level) {
      await db.execute(
        'UPDATE guests SET vip_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newLevel, guestId]
      );
    }
  }
}
