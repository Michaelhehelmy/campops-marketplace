// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useAdminRooms.ts
 * Tests admin room management hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useAdminRooms,
  useAdminRoom,
  useCreateRoom,
  useUpdateRoom,
  useDeactivateRoom,
  useAddRoomImage,
  useUploadRoomImage,
  useDeleteRoomImage,
  useReorderRoomImages,
  useAddSeasonalPrice,
  useDeleteSeasonalPrice,
} from "../queries/useAdminRooms";

// Mock the API module
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();
const mockDel = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
  put: (...args: any[]) => mockPut(...args),
  del: (...args: any[]) => mockDel(...args),
  api: {
    post: vi.fn().mockResolvedValue({ data: { media: { url: "http://upload.com/img.jpg" } } }),
  },
}));

// Create a wrapper with QueryClientProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useAdminRooms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches rooms without filters", async () => {
    const mockResponse = {
      data: [
        { id: "room-1", name: "Tent 1", type: "standard", status: "available" },
        { id: "room-2", name: "Tent 2", type: "deluxe", status: "occupied" },
      ],
      count: 2,
    };

    mockGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAdminRooms(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/rooms?");
    expect(result.current.data).toEqual(mockResponse);
  });

  it("fetches rooms with status filter", async () => {
    const mockResponse = {
      data: [{ id: "room-1", name: "Tent 1", status: "available" }],
      count: 1,
    };

    mockGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAdminRooms({ status: "available" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=available"));
  });

  it("fetches rooms with type filter", async () => {
    const mockResponse = {
      data: [{ id: "room-1", name: "Tent 1", type: "standard" }],
      count: 1,
    };

    mockGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAdminRooms({ type: "standard" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("type=standard"));
  });

  it("fetches rooms with search filter", async () => {
    const mockResponse = {
      data: [{ id: "room-1", name: "Ocean View Tent" }],
      count: 1,
    };

    mockGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAdminRooms({ search: "ocean" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("search=ocean"));
  });

  it("fetches rooms with is_active filter", async () => {
    const mockResponse = {
      data: [{ id: "room-1", name: "Tent 1", is_active: true }],
      count: 1,
    };

    mockGet.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAdminRooms({ is_active: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("is_active=true"));
  });
});

describe("useAdminRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single room by ID", async () => {
    const mockRoom = {
      data: {
        id: "room-123",
        name: "Deluxe Tent",
        type: "deluxe",
        base_price: 200,
        images: [],
        seasonal_pricing: [],
      },
    };

    mockGet.mockResolvedValue(mockRoom);

    const { result } = renderHook(() => useAdminRoom("room-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/rooms/room-123");
    expect(result.current.data).toEqual(mockRoom);
  });

  it("does not fetch when ID is empty", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useAdminRoom(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useCreateRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new room", async () => {
    const mockRoom = {
      data: {
        id: "room-new",
        name: "New Tent",
        type: "standard",
        base_price: 150,
      },
    };

    mockPost.mockResolvedValue(mockRoom);

    const { result } = renderHook(() => useCreateRoom(), {
      wrapper: createWrapper(),
    });

    const roomData = {
      name: "New Tent",
      type: "standard",
      base_price: 150,
      capacity: 2,
    };

    await result.current.mutateAsync(roomData);

    expect(mockPost).toHaveBeenCalledWith("/rooms", roomData);
  });
});

describe("useUpdateRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing room", async () => {
    const mockRoom = {
      data: {
        id: "room-123",
        name: "Updated Tent",
        base_price: 250,
      },
    };

    mockPut.mockResolvedValue(mockRoom);

    const { result } = renderHook(() => useUpdateRoom("room-123"), {
      wrapper: createWrapper(),
    });

    const updateData = {
      name: "Updated Tent",
      base_price: 250,
    };

    await result.current.mutateAsync(updateData);

    expect(mockPut).toHaveBeenCalledWith("/rooms/room-123", updateData);
  });
});

describe("useDeactivateRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deactivates a room", async () => {
    mockDel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeactivateRoom(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("room-123");

    expect(mockDel).toHaveBeenCalledWith("/rooms/room-123");
  });
});

describe("Room Image Hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds a room image", async () => {
    mockPost.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useAddRoomImage("r1"), { wrapper: createWrapper() });
    await result.current.mutateAsync({ url: "test.jpg" });
    expect(mockPost).toHaveBeenCalledWith("/rooms/r1/images", { url: "test.jpg" });
  });

  it("uploads a room image", async () => {
    const { api } = await import("@/lib/api");
    mockPost.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useUploadRoomImage("r1"), { wrapper: createWrapper() });
    const file = new File([""], "test.jpg", { type: "image/jpeg" });
    await result.current.mutateAsync({ file });
    expect(api.post).toHaveBeenCalledWith(
      "/media/upload",
      expect.any(FormData),
      expect.any(Object)
    );
    expect(mockPost).toHaveBeenCalledWith(
      "/rooms/r1/images",
      expect.objectContaining({ url: "http://upload.com/img.jpg" })
    );
  });

  it("deletes a room image", async () => {
    mockDel.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteRoomImage("r1"), { wrapper: createWrapper() });
    await result.current.mutateAsync("img1");
    expect(mockDel).toHaveBeenCalledWith("/rooms/r1/images/img1");
  });

  it("reorders room images", async () => {
    mockPut.mockResolvedValue({});
    const { result } = renderHook(() => useReorderRoomImages("r1"), { wrapper: createWrapper() });
    const order = [{ id: "img1", sort_order: 1 }];
    await result.current.mutateAsync(order);
    expect(mockPut).toHaveBeenCalledWith("/rooms/r1/images/reorder", { order });
  });
});

describe("Seasonal Pricing Hooks", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds seasonal price", async () => {
    mockPost.mockResolvedValue({ data: {} });
    const { result } = renderHook(() => useAddSeasonalPrice("r1"), { wrapper: createWrapper() });
    const price = { start_date: "2024-01-01", end_date: "2024-01-02", price_override: 100 };
    await result.current.mutateAsync(price);
    expect(mockPost).toHaveBeenCalledWith("/rooms/r1/seasonal", price);
  });

  it("deletes seasonal price", async () => {
    mockDel.mockResolvedValue({});
    const { result } = renderHook(() => useDeleteSeasonalPrice("r1"), { wrapper: createWrapper() });
    await result.current.mutateAsync("s1");
    expect(mockDel).toHaveBeenCalledWith("/rooms/r1/seasonal/s1");
  });
});
