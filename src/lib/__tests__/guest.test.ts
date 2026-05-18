import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkGuestAccess, getGuestReservations } from '../guest';
import { db } from '../db';

vi.mock('../db', () => {
  const getMock = vi.fn();
  const allMock = vi.fn();
  const runMock = vi.fn();

  const prepareMock = vi.fn().mockImplementation(() => ({
    get: getMock,
    all: allMock,
    run: runMock,
  }));

  return {
    db: {
      prepare: prepareMock,
      get: getMock,
      all: allMock,
      run: runMock,
    },
  };
});

describe('Guest Library', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkGuestAccess', () => {
    it('should return true if active confirmed reservation exists', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi.fn().mockResolvedValue({ id: 'res-1' });
      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const hasAccess = await checkGuestAccess('user-123', 'prop-456');

      expect(hasAccess).toBe(true);
      expect(prepareMock).toHaveBeenCalled();
      expect(getMock).toHaveBeenCalledWith('user-123', 'prop-456');
    });

    it('should return false if no active confirmed reservation exists', async () => {
      const prepareMock = vi.mocked(db.prepare);
      const getMock = vi.fn().mockResolvedValue(null);
      prepareMock.mockReturnValue({
        get: getMock,
        all: vi.fn(),
        run: vi.fn(),
      });

      const hasAccess = await checkGuestAccess('user-123', 'prop-456');

      expect(hasAccess).toBe(false);
      expect(prepareMock).toHaveBeenCalled();
      expect(getMock).toHaveBeenCalledWith('user-123', 'prop-456');
    });
  });

  describe('getGuestReservations', () => {
    it('should retrieve list of guest reservations', async () => {
      const mockReservations = [
        { id: 'res-1', check_in: '2026-05-18', property_name: 'Acacia Camp' },
      ];
      const prepareMock = vi.mocked(db.prepare);
      const allMock = vi.fn().mockResolvedValue(mockReservations);
      prepareMock.mockReturnValue({
        get: vi.fn(),
        all: allMock,
        run: vi.fn(),
      });

      const reservations = await getGuestReservations('user-123');

      expect(reservations).toEqual(mockReservations);
      expect(prepareMock).toHaveBeenCalled();
      expect(allMock).toHaveBeenCalledWith('user-123');
    });
  });
});
