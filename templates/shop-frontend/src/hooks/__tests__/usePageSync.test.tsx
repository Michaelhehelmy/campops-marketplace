// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/usePageSync.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { usePageSync } from "../usePageSync";

// Mock dependencies
const { useCanvasStoreMock, mockStore, mockSubscribe, mockUnsubscribe } = vi.hoisted(() => {
  const mockStore = {
    title: "Test",
    slug: "test",
    status: "draft" as const,
    blocks: [],
    seo: {},
    isDirty: false,
    setPageData: vi.fn(),
  };
  const mockSubscribe = vi.fn();
  const mockUnsubscribe = vi.fn();
  const mock = Object.assign(() => mockStore, {
    subscribe: (cb: any) => {
      mockSubscribe(cb);
      return mockUnsubscribe;
    },
  });
  return { useCanvasStoreMock: mock, mockStore, mockSubscribe, mockUnsubscribe };
});

vi.mock("@/store/canvasStore", () => ({
  useCanvasStore: useCanvasStoreMock,
  default: useCanvasStoreMock,
}));

const mockGetDraft = vi.fn();
const mockSaveDraft = vi.fn();
const mockMarkAsSynced = vi.fn();
const mockMarkAsConflict = vi.fn();
const mockDeleteDraft = vi.fn();

vi.mock("@/lib/localPageStore", () => ({
  localPageStore: {
    getDraft: (...args: any[]) => mockGetDraft(...args),
    saveDraft: (...args: any[]) => mockSaveDraft(...args),
    markAsSynced: (...args: any[]) => mockMarkAsSynced(...args),
    markAsConflict: (...args: any[]) => mockMarkAsConflict(...args),
    deleteDraft: (...args: any[]) => mockDeleteDraft(...args),
  },
}));

const mockGetPending = vi.fn();
const mockQueueOp = vi.fn();
const mockProcessQueue = vi.fn();

vi.mock("@/lib/pageSyncQueue", () => ({
  pageSyncQueue: {
    getPendingOperations: () => mockGetPending(),
    queueOperation: (...a: any[]) => mockQueueOp(...a),
    processQueue: (...a: any[]) => mockProcessQueue(...a),
  },
  PageOperationType: {},
}));

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({ toast: (...a: any[]) => mockToast(...a) }));

const mockReload = vi.fn();
Object.defineProperty(window, "location", { value: { reload: mockReload }, writable: true });

describe("usePageSync", () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "onLine", { value: true, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial state", () => {
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.hasConflict).toBe(false);
    expect(result.current.saveWithSync).toBeInstanceOf(Function);
  });

  it("loads from local storage when offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
    mockGetDraft.mockResolvedValue({
      title: "Draft",
      slug: "draft",
      status: "draft",
      blocks: [],
      seo: {},
    });
    renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    await waitFor(() => {
      expect(mockGetDraft).toHaveBeenCalledWith("p1");
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Loaded from Local Storage" })
    );
  });

  it("queues save when offline", async () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
      writable: true,
      configurable: true,
    });
    mockQueueOp.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    await act(async () => {
      await result.current.saveWithSync(vi.fn().mockResolvedValue(undefined));
    });
    expect(mockQueueOp).toHaveBeenCalledWith("save", "p1", expect.any(Object));
  });

  it("saves directly when online", async () => {
    mockMarkAsSynced.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    const saveFn = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      await result.current.saveWithSync(saveFn);
    });
    expect(saveFn).toHaveBeenCalled();
    expect(mockMarkAsSynced).toHaveBeenCalledWith("p1");
  });

  it("handles 409 conflict error", async () => {
    mockMarkAsConflict.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    const err = new Error("Conflict") as any;
    err.response = { status: 409 };
    await act(async () => {
      try {
        await result.current.saveWithSync(vi.fn().mockRejectedValue(err));
      } catch (e) {
        /* expected */
      }
    });
    expect(mockMarkAsConflict).toHaveBeenCalledWith("p1");
  });

  it("reloads on conflict resolve 'reload'", async () => {
    mockDeleteDraft.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    await act(async () => {
      await result.current.resolveConflict("reload");
    });
    expect(mockDeleteDraft).toHaveBeenCalledWith("p1");
    expect(mockReload).toHaveBeenCalled();
  });

  it("keeps local version on conflict resolve 'keep'", async () => {
    mockSaveDraft.mockResolvedValue(undefined);
    mockQueueOp.mockResolvedValue(undefined);
    const { result } = renderHook(() => usePageSync({ pageId: "p1", onSave: mockOnSave }));
    await act(async () => {
      await result.current.resolveConflict("keep");
    });
    expect(mockSaveDraft).toHaveBeenCalledWith("p1", expect.any(Object));
    expect(mockQueueOp).toHaveBeenCalledWith("save", "p1", expect.any(Object));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Changes Re-queued" }));
  });
});
