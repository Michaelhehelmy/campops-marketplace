import { describe, it, expect, vi } from 'vitest';
import init from '../src/index';

describe('Booking Plugin', () => {
  function buildMockApi(overrides: any = {}) {
    return {
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
      db: {
        createTable: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue({ id: 'test-123', guest_name: 'John' }),
        getTable: vi.fn().mockReturnValue({
          findMany: vi.fn().mockResolvedValue([]),
          findById: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue(undefined),
        }),
      },
      ui: {
        addSlotComponent: vi.fn(),
        addSettingsPage: vi.fn(),
        registerSlot: vi.fn(),
        registerMenuItem: vi.fn(),
        addMenuItem: vi.fn(),
        registerDashboardWidget: vi.fn(),
        registerSettingsPage: vi.fn(),
      },
      registerRoute: vi.fn(),
      registerHook: vi.fn().mockReturnValue(() => {}),
      executeHook: vi.fn().mockResolvedValue({}),
      hooks: {
        register: vi.fn().mockReturnValue(() => {}),
        registerHook: vi.fn().mockReturnValue(() => {}),
        execute: vi.fn().mockResolvedValue({}),
        executeHook: vi.fn().mockResolvedValue({}),
      },
      ...overrides,
    };
  }

  it('initializes and creates tables for rooms, availability, and bookings', async () => {
    const api = buildMockApi();
    await init(api as any);

    const tableNames = (api.db.createTable as any).mock.calls.map((c: any) => c[0]);
    expect(tableNames).toContain('rooms');
    expect(tableNames).toContain('room_availability');
    expect(tableNames).toContain('bookings');
  });

  it('registers UI slot components for booking', async () => {
    const api = buildMockApi();
    await init(api as any);

    const slotCalls = (api.ui.addSlotComponent as any).mock.calls;
    const slotNames = slotCalls.map((c: any) => c[0]);
    expect(slotNames).toContain('public.booking');
    expect(slotNames).toContain('manager.bookings');
    expect(slotNames).toContain('guest.dashboard');
  });

  it('registers BOOKING_CREATED hook', async () => {
    const api = buildMockApi();
    await init(api as any);

    const hookNames = (api.registerHook as any).mock.calls.map((c: any) => c[0]);
    expect(hookNames).toContain('BOOKING_CREATED');
  });

  it('registers API routes', async () => {
    const api = buildMockApi();
    await init(api as any);

    expect(api.registerRoute).toHaveBeenCalled();
  });

  it('returns bookingService and roomService', async () => {
    const api = buildMockApi();
    const result = await init(api as any);

    expect(result).toBeDefined();
    expect((result as any).bookingService).toBeDefined();
    expect((result as any).roomService).toBeDefined();
  });
});
