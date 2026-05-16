import { describe, it, expect, vi } from 'vitest';
import { LoyaltyService } from '../src/LoyaltyService';

describe('LoyaltyService', () => {
  describe('calculateEarnedPoints', () => {
    it('calculates regular points correctly', () => {
      const points = LoyaltyService.calculateEarnedPoints(100, 10, 5, 'regular', 1.5);
      // 100 USD * 10 rate * 0.05 earn = 50 points
      expect(points).toBe(50);
    });

    it('calculates VIP points correctly', () => {
      const points = LoyaltyService.calculateEarnedPoints(100, 10, 5, 'gold', 1.5);
      // 50 points * 1.5 multiplier = 75 points
      expect(points).toBe(75);
    });

    it('handles null/undefined vipLevel gracefully', () => {
      const points = LoyaltyService.calculateEarnedPoints(100, 10, 5, null as any, 1.5);
      expect(points).toBe(50);
    });
  });

  describe('awardPoints', () => {
    it('executes SQL to award points', async () => {
      const db = { execute: vi.fn().mockResolvedValue(undefined) };
      await LoyaltyService.awardPoints(db, 'guest-1', 100, 'ref-1', 'notes');

      expect(db.execute).toHaveBeenCalledTimes(2);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO point_transactions'),
        ['guest-1', 100, 'ref-1', 'notes']
      );
    });
  });

  describe('redeemPoints', () => {
    it('executes SQL to redeem points', async () => {
      const db = { execute: vi.fn().mockResolvedValue(undefined) };
      await LoyaltyService.redeemPoints(db, 'guest-1', 50, 'ref-2', 'notes');

      expect(db.execute).toHaveBeenCalledTimes(2);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO point_transactions'),
        ['guest-1', -50, 'ref-2', 'notes']
      );
    });
  });

  describe('checkAndUpgradeTier', () => {
    const mockDb = (guestData: any) => ({
      queryOne: vi.fn().mockResolvedValue(guestData),
      execute: vi.fn().mockResolvedValue(undefined),
    });

    it('returns early if guest not found', async () => {
      const db = mockDb(null);
      await LoyaltyService.checkAndUpgradeTier(db, 'ghost');
      expect(db.execute).not.toHaveBeenCalled();
    });

    it('upgrades to platinum on points', async () => {
      const db = mockDb({ loyalty_points: '50000', vip_level: 'regular' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE guests'), [
        'platinum',
        'guest-1',
      ]);
    });

    it('upgrades to platinum on spend', async () => {
      const db = mockDb({ total_spend_usd: '10000', vip_level: 'regular' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE guests'), [
        'platinum',
        'guest-1',
      ]);
    });

    it('upgrades to gold', async () => {
      const db = mockDb({ loyalty_points: '10000', vip_level: 'regular' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE guests'), [
        'gold',
        'guest-1',
      ]);
    });

    it('upgrades to silver', async () => {
      const db = mockDb({ total_spend_usd: '500', vip_level: 'regular' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE guests'), [
        'silver',
        'guest-1',
      ]);
    });

    it('downgrades to regular if points/spend dropped (sanity check)', async () => {
      const db = mockDb({ loyalty_points: '100', vip_level: 'platinum' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).toHaveBeenCalledWith(expect.stringContaining('UPDATE guests'), [
        'regular',
        'guest-1',
      ]);
    });

    it('does not execute update if level remains the same', async () => {
      const db = mockDb({ loyalty_points: '100', vip_level: 'regular' });
      await LoyaltyService.checkAndUpgradeTier(db, 'guest-1');
      expect(db.execute).not.toHaveBeenCalled();
    });
  });
});
