import { describe, it, expect, vi, beforeEach } from 'vitest';
import init from '../src/index';

describe('iCal Sync Plugin', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('registers hooks and UI dashboard widgets on init', async () => {
    const mockApi = {
      logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      registerHook: vi.fn(),
      ui: { addDashboardWidget: vi.fn() },
    };

    await init(mockApi as any);

    expect(mockApi.registerHook).toHaveBeenCalledTimes(3);
    expect(mockApi.registerHook).toHaveBeenCalledWith(
      'reservations.after_create',
      expect.any(Function),
      10
    );
    expect(mockApi.registerHook).toHaveBeenCalledWith(
      'reservations.after_cancel',
      expect.any(Function),
      10
    );
    expect(mockApi.registerHook).toHaveBeenCalledWith(
      'ical.sync_requested',
      expect.any(Function),
      10
    );
    expect(mockApi.ui.addDashboardWidget).toHaveBeenCalledWith({
      id: 'ical-sync-status',
      title: 'iCal Sync Status',
      component: 'ICalSyncWidget',
      width: 'sm',
    });
  });

  it('publishes reservation:created event when reservations.after_create hook is called', async () => {
    let createHandler: any;
    const mockApi = {
      logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      ui: { addDashboardWidget: vi.fn() },
      publish: vi.fn(),
      registerHook: (name: string, handler: any) => {
        if (name === 'reservations.after_create') createHandler = handler;
      },
    };

    await init(mockApi as any);

    const reservation = {
      id: 'res-1',
      roomId: 'room-1',
      checkIn: '2026-05-18',
      checkOut: '2026-05-20',
      guestName: 'Guest 1',
      propertyId: 'prop-1',
    };

    const res = await createHandler(reservation);
    expect(res).toEqual(reservation);
    expect(mockApi.publish).toHaveBeenCalledWith('reservation:created', {
      reservationId: 'res-1',
      roomId: 'room-1',
      checkIn: '2026-05-18',
      checkOut: '2026-05-20',
      propertyId: 'prop-1',
    });
  });

  it('publishes reservation:cancelled event when reservations.after_cancel hook is called', async () => {
    let cancelHandler: any;
    const mockApi = {
      logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
      ui: { addDashboardWidget: vi.fn() },
      publish: vi.fn(),
      registerHook: (name: string, handler: any) => {
        if (name === 'reservations.after_cancel') cancelHandler = handler;
      },
    };

    await init(mockApi as any);

    const reservation = {
      id: 'res-1',
      roomId: 'room-1',
      checkIn: '2026-05-18',
      checkOut: '2026-05-20',
      guestName: 'Guest 1',
      propertyId: 'prop-1',
    };

    const res = await cancelHandler(reservation);
    expect(res).toEqual(reservation);
    expect(mockApi.publish).toHaveBeenCalledWith('reservation:cancelled', {
      reservationId: 'res-1',
      roomId: 'room-1',
      propertyId: 'prop-1',
    });
  });

  describe('ical.sync_requested hook', () => {
    it('queries rooms, fetches external feeds, and publishes ical:events_fetched', async () => {
      let syncHandler: any;
      const mockRooms = [
        { id: 'room-1', ical_sync_url: null },
        { id: 'room-2', property_id: 'prop-1', ical_sync_url: 'http://example.com/feed.ics' },
      ];

      const findManyMock = vi.fn().mockResolvedValue(mockRooms);
      const mockApi = {
        logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
        ui: { addDashboardWidget: vi.fn() },
        publish: vi.fn(),
        registerHook: (name: string, handler: any) => {
          if (name === 'ical.sync_requested') syncHandler = handler;
        },
        db: {
          getTable: () => ({ findMany: findManyMock }),
        },
      };

      await init(mockApi as any);

      // Mock global fetch
      const mockICalText = `
BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:evt-1
DTSTART:20260518T120000Z
DTEND:20260520T120000Z
SUMMARY:Reservation 1
END:VEVENT
END:VCALENDAR
`;
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockICalText),
      });
      vi.stubGlobal('fetch', fetchMock);

      await syncHandler({ propertyId: 'prop-1' });

      expect(findManyMock).toHaveBeenCalledWith({ property_id: 'prop-1' });
      expect(fetchMock).toHaveBeenCalledWith('http://example.com/feed.ics', expect.any(Object));
      expect(mockApi.publish).toHaveBeenCalledWith('ical:events_fetched', {
        roomId: 'room-2',
        propertyId: 'prop-1',
        events: [
          {
            uid: 'evt-1',
            dtStart: '20260518T120000Z',
            dtEnd: '20260520T120000Z',
            summary: 'Reservation 1',
          },
        ],
        syncedAt: expect.any(String),
      });
      expect(mockApi.logger.info).toHaveBeenCalledWith(
        'iCal sync complete — 1 room(s) synced, 0 error(s)'
      );
    });

    it('logs error if fetch fails or returns not ok status', async () => {
      let syncHandler: any;
      const mockRooms = [
        { id: 'room-3', property_id: 'prop-1', ical_sync_url: 'http://example.com/fail.ics' },
      ];

      const findManyMock = vi.fn().mockResolvedValue(mockRooms);
      const mockApi = {
        logger: { info: vi.fn(), debug: vi.fn(), error: vi.fn() },
        ui: { addDashboardWidget: vi.fn() },
        publish: vi.fn(),
        registerHook: (name: string, handler: any) => {
          if (name === 'ical.sync_requested') syncHandler = handler;
        },
        db: {
          getTable: () => ({ findMany: findManyMock }),
        },
      };

      await init(mockApi as any);

      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal('fetch', fetchMock);

      await syncHandler({});

      expect(findManyMock).toHaveBeenCalledWith(undefined);
      expect(mockApi.logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to sync room room-3 from http://example.com/fail.ics: iCal fetch failed: HTTP 404'
        )
      );
      expect(mockApi.logger.info).toHaveBeenCalledWith(
        'iCal sync complete — 0 room(s) synced, 1 error(s)'
      );
    });
  });
});
