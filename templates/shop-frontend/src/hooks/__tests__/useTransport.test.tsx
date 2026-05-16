// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useTransport.ts
 * Tests transportation/vehicle management hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useDrivers,
  useCreateDriver,
  useUpdateDriver,
  useDeleteDriver,
  useTransfers,
} from "../queries/useTransport";

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

describe("useVehicles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all vehicles", async () => {
    const mockVehicles = {
      data: [
        { id: "v1", name: "Jeep 1", type: "suv", capacity: 5 },
        { id: "v2", name: "Van 1", type: "van", capacity: 12 },
      ],
    };

    mockGet.mockResolvedValue(mockVehicles);

    const { result } = renderHook(() => useVehicles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/transport/vehicles");
    expect(result.current.data).toEqual(mockVehicles.data);
  });
});

describe("useCreateVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new vehicle", async () => {
    const mockVehicle = {
      data: {
        id: "v-new",
        name: "New Jeep",
        type: "suv",
        capacity: 5,
      },
    };

    mockPost.mockResolvedValue(mockVehicle);

    const { result } = renderHook(() => useCreateVehicle(), {
      wrapper: createWrapper(),
    });

    const vehicleData = {
      name: "New Jeep",
      type: "suv",
      capacity: 5,
    };

    await result.current.mutateAsync(vehicleData);

    expect(mockPost).toHaveBeenCalledWith("/transport/vehicles", vehicleData);
  });
});

describe("useUpdateVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing vehicle", async () => {
    const mockVehicle = {
      data: {
        id: "v-123",
        name: "Updated Jeep",
        capacity: 6,
      },
    };

    mockPut.mockResolvedValue(mockVehicle);

    const { result } = renderHook(() => useUpdateVehicle(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: "v-123",
      data: { name: "Updated Jeep", capacity: 6 },
    });

    expect(mockPut).toHaveBeenCalledWith("/transport/vehicles/v-123", {
      name: "Updated Jeep",
      capacity: 6,
    });
  });
});

describe("useDeleteVehicle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a vehicle", async () => {
    mockDel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteVehicle(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("v-123");

    expect(mockDel).toHaveBeenCalledWith("/transport/vehicles/v-123");
  });
});

describe("useDrivers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all drivers", async () => {
    const mockDrivers = {
      data: [
        { id: "d1", full_name: "John Driver", phone: "+1234567890" },
        { id: "d2", full_name: "Jane Driver", phone: "+0987654321" },
      ],
    };

    mockGet.mockResolvedValue(mockDrivers);

    const { result } = renderHook(() => useDrivers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/transport/drivers");
    expect(result.current.data).toEqual(mockDrivers.data);
  });
});

describe("useCreateDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new driver", async () => {
    const mockDriver = {
      data: {
        id: "d-new",
        full_name: "New Driver",
        phone: "+1234567890",
      },
    };

    mockPost.mockResolvedValue(mockDriver);

    const { result } = renderHook(() => useCreateDriver(), {
      wrapper: createWrapper(),
    });

    const driverData = {
      full_name: "New Driver",
      phone: "+1234567890",
    };

    await result.current.mutateAsync(driverData);

    expect(mockPost).toHaveBeenCalledWith("/transport/drivers", driverData);
  });
});

describe("useUpdateDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing driver", async () => {
    const mockDriver = {
      data: {
        id: "d-123",
        full_name: "Updated Driver",
      },
    };

    mockPut.mockResolvedValue(mockDriver);

    const { result } = renderHook(() => useUpdateDriver(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: "d-123",
      data: { full_name: "Updated Driver" },
    });

    expect(mockPut).toHaveBeenCalledWith("/transport/drivers/d-123", {
      full_name: "Updated Driver",
    });
  });
});

describe("useDeleteDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a driver", async () => {
    mockDel.mockResolvedValue(undefined);

    const { result } = renderHook(() => useDeleteDriver(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync("d-123");

    expect(mockDel).toHaveBeenCalledWith("/transport/drivers/d-123");
  });
});

describe("useTransfers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches transfers without filters", async () => {
    const mockTransfers = {
      data: [
        { id: "t1", guest_name: "Guest 1", status: "scheduled" },
        { id: "t2", guest_name: "Guest 2", status: "completed" },
      ],
      page: 1,
      limit: 10,
    };

    mockGet.mockResolvedValue(mockTransfers);

    const { result } = renderHook(() => useTransfers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/transport/transfers");
    expect(result.current.data).toEqual(mockTransfers);
  });

  it("fetches transfers with all filters", async () => {
    const mockTransfers = {
      data: [{ id: "t1", guest_name: "Guest 1", status: "scheduled" }],
      page: 2,
      limit: 5,
    };

    mockGet.mockResolvedValue(mockTransfers);

    const { result } = renderHook(
      () =>
        useTransfers({
          status: "scheduled",
          date_from: "2024-01-01",
          date_to: "2024-01-31",
          page: 2,
          limit: 5,
        }),
      {
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/transport/transfers?"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=scheduled"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("date_from=2024-01-01"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("date_to=2024-01-31"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("page=2"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("limit=5"));
  });
});
