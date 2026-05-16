// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/useBilling.ts
 * Tests all billing-related React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  useFolio,
  useMyFolios,
  useCreatePayment,
  useMarkFolioAsPaid,
  useAdjustFolio,
  useCashPayment,
} from "../queries/useBilling";

// Mock the API module
const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
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

describe("useFolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches folio by ID", async () => {
    const mockFolio = {
      id: "folio-123",
      guest_id: "guest-456",
      balance: 150.5,
      status: "open",
      items: [],
    };

    mockGet.mockResolvedValue({ data: mockFolio });

    const { result } = renderHook(() => useFolio("folio-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/billing/folio-123");
    expect(result.current.data).toEqual(mockFolio);
  });

  it("does not fetch when ID is empty", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useFolio(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("handles error state", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useFolio("folio-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe("useMyFolios", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches current guest's folios", async () => {
    const mockFolio = {
      id: "folio-123",
      guest_id: "guest-456",
      balance: 200,
      status: "open",
    };

    mockGet.mockResolvedValue({ data: mockFolio });

    const { result } = renderHook(() => useMyFolios(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/billing/guests/live-bill");
    expect(result.current.data).toEqual(mockFolio);
  });
});

describe("useCreatePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a payment successfully", async () => {
    const mockPayment = {
      id: "payment-123",
      folio_id: "folio-456",
      amount: 100,
      method: "card",
      status: "completed",
    };

    mockPost.mockResolvedValue({ data: mockPayment });

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-456",
      amount: 100,
      method: "card",
      reference: "REF-123",
    });

    expect(mockPost).toHaveBeenCalledWith("/payments", {
      folio_id: "folio-456",
      amount: 100,
      method: "card",
      reference: "REF-123",
    });
  });

  it("handles payment with points redeemed", async () => {
    const mockPayment = {
      id: "payment-123",
      folio_id: "folio-456",
      amount: 50,
      method: "points",
      points_redeemed: 500,
    };

    mockPost.mockResolvedValue({ data: mockPayment });

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-456",
      amount: 50,
      method: "points",
      points_redeemed: 500,
    });

    expect(mockPost).toHaveBeenCalledWith("/payments", {
      folio_id: "folio-456",
      amount: 50,
      method: "points",
      points_redeemed: 500,
    });
  });

  it("invalidates folio queries on success", async () => {
    const mockPayment = { id: "payment-123", folio_id: "folio-456" };
    mockPost.mockResolvedValue({ data: mockPayment });

    const queryClient = new QueryClient();
    const invalidateQueriesSpy = vi.spyOn(queryClient, "invalidateQueries");

    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: CustomWrapper,
    });

    await result.current.mutateAsync({
      folio_id: "folio-456",
      amount: 100,
      method: "cash",
    });

    await waitFor(() => {
      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });
});

describe("useMarkFolioAsPaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks folio as paid with note", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useMarkFolioAsPaid(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
      note: "Paid in cash at reception",
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/folio-123/mark-paid", {
      note: "Paid in cash at reception",
    });
  });

  it("marks folio as paid without note", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useMarkFolioAsPaid(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/folio-123/mark-paid", {
      note: undefined,
    });
  });
});

describe("useAdjustFolio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies discount to folio", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAdjustFolio(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
      amount: 25,
      description: "Loyalty discount",
      type: "discount",
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/folio-123/adjust", {
      folio_id: "folio-123",
      amount: 25,
      description: "Loyalty discount",
      type: "discount",
    });
  });

  it("applies surcharge to folio", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useAdjustFolio(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
      amount: 15,
      description: "Late checkout fee",
      type: "surcharge",
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/folio-123/adjust", {
      folio_id: "folio-123",
      amount: 15,
      description: "Late checkout fee",
      type: "surcharge",
    });
  });
});

describe("useCashPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("processes cash payment", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useCashPayment(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
      amount: 150,
      note: "Guest paid cash",
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/payments/cash", {
      folio_id: "folio-123",
      amount: 150,
      note: "Guest paid cash",
    });
  });

  it("processes cash payment without note", async () => {
    mockPost.mockResolvedValue({ data: { success: true } });

    const { result } = renderHook(() => useCashPayment(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      folio_id: "folio-123",
      amount: 200,
    });

    expect(mockPost).toHaveBeenCalledWith("/billing/payments/cash", {
      folio_id: "folio-123",
      amount: 200,
      note: undefined,
    });
  });
});
