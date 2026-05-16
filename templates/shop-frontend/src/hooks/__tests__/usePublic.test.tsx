// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/usePublic.ts
 * Tests public-facing hooks for contact/inquiry
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { usePublicSettings, useSubmitInquiry } from "../queries/usePublic";

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

describe("usePublicSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches public settings", async () => {
    const mockSettings = {
      camp_name: "Test Camp",
      camp_tagline: "Your perfect getaway",
      contact_email: "info@testcamp.com",
      contact_phone: "+1234567890",
      hero_title: "Welcome to Test Camp",
      hero_subtitle: "Experience nature",
      instagram_url: "https://instagram.com/testcamp",
      facebook_url: "https://facebook.com/testcamp",
    };

    mockGet.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => usePublicSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/settings");
    expect(result.current.data).toEqual(mockSettings);
  });

  it("handles partial settings response", async () => {
    const mockSettings = {
      camp_name: "Minimal Camp",
      contact_email: "info@minimal.camp",
    };

    mockGet.mockResolvedValue(mockSettings);

    const { result } = renderHook(() => usePublicSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.camp_name).toBe("Minimal Camp");
    expect(result.current.data?.hero_title).toBeUndefined();
  });

  it("handles error state", async () => {
    mockGet.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => usePublicSettings(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});

describe("useSubmitInquiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits inquiry successfully", async () => {
    const mockResponse = {
      success: true,
      message: "Thank you for your inquiry! We'll get back to you soon.",
    };

    mockPost.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSubmitInquiry(), {
      wrapper: createWrapper(),
    });

    const inquiryData = {
      guest_name: "John Doe",
      email: "john@example.com",
      phone: "+1234567890",
      subject: "Booking Question",
      message: "Do you have availability in June?",
    };

    await result.current.mutateAsync(inquiryData);

    await waitFor(() => {
      expect(result.current.data).toEqual(mockResponse);
    });
    expect(mockPost).toHaveBeenCalledWith("/public/inquiry", inquiryData);
  });

  it("submits inquiry without phone", async () => {
    const mockResponse = {
      success: true,
      message: "Inquiry submitted",
    };

    mockPost.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useSubmitInquiry(), {
      wrapper: createWrapper(),
    });

    const inquiryData = {
      guest_name: "Jane Doe",
      email: "jane@example.com",
      subject: "General Question",
      message: "What are your check-in times?",
    };

    await result.current.mutateAsync(inquiryData);

    expect(mockPost).toHaveBeenCalledWith("/public/inquiry", inquiryData);
  });

  it("handles submission error", async () => {
    mockPost.mockRejectedValue(new Error("Submission failed"));

    const { result } = renderHook(() => useSubmitInquiry(), {
      wrapper: createWrapper(),
    });

    try {
      await result.current.mutateAsync({
        guest_name: "Test",
        email: "test@test.com",
        subject: "Test",
        message: "Test message",
      });
    } catch (e) {
      // Expected to throw
    }

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBeDefined();
  });
});
