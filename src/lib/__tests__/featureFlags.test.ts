import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.unmock('../featureFlags');
vi.unmock('../featureFlags.js');
vi.unmock('../../../src/lib/featureFlags.js');
vi.unmock('@/lib/featureFlags');
vi.unmock('@/lib/featureFlags.js');

import { checkFlag } from '../featureFlags';
import { db } from '../db';

vi.mock('../db', () => ({
  db: {
    prepare: vi.fn(),
  },
}));

describe('featureFlags.checkFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return true if flag is enabled', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ is_enabled: 1 }),
    });
    const result = await checkFlag('enabled_flag');
    expect(result).toBe(true);
  });

  it('should return false if flag is disabled', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockReturnValue({ is_enabled: 0 }),
    });
    const result = await checkFlag('disabled_flag');
    expect(result).toBe(false);
  });

  it('should return false if flag is null/missing', async () => {
    (db.prepare as any).mockReturnValue({
      get: vi.fn().mockReturnValue(null),
    });
    const result = await checkFlag('missing_flag');
    expect(result).toBe(false);
  });

  it('should return false on database error', async () => {
    (db.prepare as any).mockImplementation(() => {
      throw new Error('Database down');
    });
    const result = await checkFlag('error_flag');
    expect(result).toBe(false);
  });
});
