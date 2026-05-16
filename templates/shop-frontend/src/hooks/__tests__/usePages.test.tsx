// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/queries/usePages.ts
 * Tests page builder (CMS) React Query hooks
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  usePages,
  usePage,
  usePublicPage,
  useCreatePage,
  useUpdatePage,
} from "../queries/usePages";

// Mock the API module
const mockGet = vi.fn();
const mockPost = vi.fn();
const mockPut = vi.fn();

vi.mock("@/lib/api", () => ({
  get: (...args: any[]) => mockGet(...args),
  post: (...args: any[]) => mockPost(...args),
  put: (...args: any[]) => mockPut(...args),
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

describe("usePages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches all pages", async () => {
    const mockPages = {
      data: [
        { id: "page-1", title: "Home", slug: "home", status: "published" },
        { id: "page-2", title: "About", slug: "about", status: "draft" },
      ],
      total: 2,
    };

    mockGet.mockResolvedValue(mockPages);

    const { result } = renderHook(() => usePages(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/pages");
    expect(result.current.data).toEqual(mockPages);
  });

  it("fetches pages with status filter", async () => {
    const mockPages = {
      data: [{ id: "page-1", title: "Home", slug: "home", status: "published" }],
      total: 1,
    };

    mockGet.mockResolvedValue(mockPages);

    const { result } = renderHook(() => usePages({ status: "published" }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("/pages?"));
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("status=published"));
  });

  it("fetches pages with limit", async () => {
    const mockPages = {
      data: [{ id: "page-1", title: "Home", slug: "home" }],
      total: 10,
    };

    mockGet.mockResolvedValue(mockPages);

    const { result } = renderHook(() => usePages({ limit: 5 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining("limit=5"));
  });
});

describe("usePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches single page by ID", async () => {
    const mockPage = {
      id: "page-123",
      title: "Test Page",
      slug: "test-page",
      content: [],
    };

    mockGet.mockResolvedValue({ data: mockPage });

    const { result } = renderHook(() => usePage("page-123"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/pages/page-123");
    expect(result.current.data).toEqual(mockPage);
  });

  it("does not fetch when ID is empty", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => usePage(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it("does not fetch when ID is 'new'", () => {
    mockGet.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => usePage("new"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("usePublicPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches public page by slug", async () => {
    const mockPage = {
      id: "page-123",
      title: "Public Page",
      slug: "public-page",
      content: [{ type: "text", content: "Hello" }],
    };

    mockGet.mockResolvedValue(mockPage);

    const { result } = renderHook(() => usePublicPage("public-page"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(mockGet).toHaveBeenCalledWith("/public/page/public-page");
    expect(result.current.data).toEqual(mockPage);
  });

  it("does not fetch when slug is empty", () => {
    mockGet.mockResolvedValue({});

    const { result } = renderHook(() => usePublicPage(""), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
    expect(mockGet).not.toHaveBeenCalled();
  });
});

describe("useCreatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new page", async () => {
    const mockPage = {
      id: "page-new",
      title: "New Page",
      slug: "new-page",
      status: "draft",
    };

    mockPost.mockResolvedValue({ data: mockPage });

    const { result } = renderHook(() => useCreatePage(), {
      wrapper: createWrapper(),
    });

    const pageData = {
      title: "New Page",
      slug: "new-page",
      content: [],
    };

    await result.current.mutateAsync(pageData);

    expect(mockPost).toHaveBeenCalledWith("/pages", pageData);
  });

  it("invalidates pages query on success", async () => {
    const mockPage = { id: "page-1", title: "Test" };
    mockPost.mockResolvedValue({ data: mockPage });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreatePage(), {
      wrapper: CustomWrapper,
    });

    await result.current.mutateAsync({ title: "Test Page" });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalled();
    });
  });
});

describe("useUpdatePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates an existing page", async () => {
    const mockPage = {
      id: "page-123",
      title: "Updated Page",
      slug: "updated-page",
    };

    mockPut.mockResolvedValue({ data: mockPage });

    const { result } = renderHook(() => useUpdatePage(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      id: "page-123",
      data: { title: "Updated Page" },
    });

    expect(mockPut).toHaveBeenCalledWith("/pages/page-123", { title: "Updated Page" });
  });

  it("invalidates page and pages queries on success", async () => {
    const mockPage = { id: "page-123", title: "Updated" };
    mockPut.mockResolvedValue({ data: mockPage });

    const queryClient = new QueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const CustomWrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useUpdatePage(), {
      wrapper: CustomWrapper,
    });

    await result.current.mutateAsync({
      id: "page-123",
      data: { title: "Updated Page" },
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(2);
    });
  });
});
