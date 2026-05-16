// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePageSync } from "../usePageSync";
import { localPageStore } from "@/lib/localPageStore";
import { pageSyncQueue } from "@/lib/pageSyncQueue";
import { useCanvasStore } from "@/store/canvasStore";
import { toast } from "@/hooks/use-toast";

// Mocks
vi.mock("@/lib/localPageStore", () => ({
  localPageStore: {
    getDraft: vi.fn(),
    saveDraft: vi.fn(),
    markAsSynced: vi.fn(),
    markAsConflict: vi.fn(),
    deleteDraft: vi.fn(),
  },
}));

vi.mock("@/lib/pageSyncQueue", () => ({
  pageSyncQueue: {
    getPendingOperations: vi.fn(),
    processQueue: vi.fn(),
    queueOperation: vi.fn(),
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

// We need a way to mock navigator.onLine
const mockNavigator = (isOnline: boolean) => {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(isOnline);
};

describe("usePageSync", () => {
  const pageId = "test-page-1";
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator(true);
    // Reset canvas store
    useCanvasStore.getState().reset();
  });

  it("loads local data when offline and draft exists", async () => {
    mockNavigator(false);
    const mockDraft = {
      title: "Local Title",
      slug: "local-slug",
      status: "draft",
      blocks: [],
      seo: {},
    };
    (localPageStore.getDraft as any).mockResolvedValue(mockDraft);

    renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await act(async () => {
      // Wait for useEffect
    });

    expect(localPageStore.getDraft).toHaveBeenCalledWith(pageId);
    expect(useCanvasStore.getState().title).toBe("Local Title");
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Loaded from Local Storage" })
    );
  });

  it("auto-saves to local storage when canvas becomes dirty", async () => {
    vi.useFakeTimers();
    renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    act(() => {
      useCanvasStore.getState().setTitle("New Title");
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(localPageStore.saveDraft).toHaveBeenCalledWith(
      pageId,
      expect.objectContaining({ title: "New Title" })
    );
    vi.useRealTimers();
  });

  it("processes sync queue when coming back online", async () => {
    const mockPending = [{ id: "op1", type: "save", pageId, data: { title: "P" } }];
    (pageSyncQueue.getPendingOperations as any).mockResolvedValue(mockPending);
    (pageSyncQueue.processQueue as any).mockResolvedValue({ success: 1, failed: 0, conflicts: [] });

    renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    // Simulate online event
    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(pageSyncQueue.processQueue).toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync Complete" }));
  });

  it("handles sync conflicts during online event", async () => {
    const mockPending = [{ id: "op1", type: "save", pageId, data: { title: "P" } }];
    (pageSyncQueue.getPendingOperations as any).mockResolvedValue(mockPending);
    (pageSyncQueue.processQueue as any).mockResolvedValue({
      success: 0,
      failed: 1,
      conflicts: [mockPending[0]],
    });

    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await act(async () => {
      window.dispatchEvent(new Event("online"));
    });

    expect(result.current.hasConflict).toBe(true);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Sync Conflicts" }));
  });

  it("queues operation if saving while offline", async () => {
    mockNavigator(false);
    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await act(async () => {
      await result.current.saveWithSync(mockOnSave);
    });

    expect(pageSyncQueue.queueOperation).toHaveBeenCalledWith("save", pageId, expect.any(Object));
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("saves immediately and marks as synced if online", async () => {
    mockNavigator(true);
    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await act(async () => {
      await result.current.saveWithSync(mockOnSave);
    });

    expect(mockOnSave).toHaveBeenCalled();
    expect(localPageStore.markAsSynced).toHaveBeenCalledWith(pageId);
  });

  it("handles 409 conflict during save", async () => {
    mockNavigator(true);
    const error409 = { response: { status: 409 } };
    const mockBrokenSave = vi.fn().mockRejectedValue(error409);

    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await expect(
      act(async () => {
        await result.current.saveWithSync(mockBrokenSave);
      })
    ).rejects.toEqual(error409);

    await act(async () => {
      // Just to be sure state updates are flushed
    });

    expect(result.current.hasConflict).toBe(true);
    expect(localPageStore.markAsConflict).toHaveBeenCalledWith(pageId);
  });

  it("resolves conflict by reloading", async () => {
    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    // Mock window.location.reload
    const originalLocation = window.location;
    // @ts-ignore
    delete window.location;
    window.location = { ...originalLocation, reload: vi.fn() };

    await act(async () => {
      await result.current.resolveConflict("reload");
    });

    expect(localPageStore.deleteDraft).toHaveBeenCalledWith(pageId);
    expect(window.location.reload).toHaveBeenCalled();

    window.location = originalLocation;
  });

  it("resolves conflict by keeping local version", async () => {
    const { result } = renderHook(() => usePageSync({ pageId, onSave: mockOnSave }));

    await act(async () => {
      await result.current.resolveConflict("keep");
    });

    expect(result.current.hasConflict).toBe(false);
    expect(localPageStore.saveDraft).toHaveBeenCalled();
    expect(pageSyncQueue.queueOperation).toHaveBeenCalled();
  });
});
