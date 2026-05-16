// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/components/OfflineBanner.tsx
 */

import React from "react";
import { describe, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OfflineBanner } from "../OfflineBanner";

// Mock the usePWA hook
const mockIsOffline = vi.fn();
const mockShowBanner = vi.fn();
const mockDismissBanner = vi.fn();

vi.mock("@/hooks/usePWA", () => ({
  useOfflineBanner: () => ({
    isOffline: mockIsOffline(),
    showBanner: mockShowBanner(),
    dismissBanner: mockDismissBanner,
  }),
  usePWA: () => ({
    isOffline: mockIsOffline(),
    showBanner: mockShowBanner(),
    dismissBanner: mockDismissBanner,
  }),
}));

// Mock offlineQueue
const mockFns = {
  getPendingCount: vi.fn(),
  sync: vi.fn(),
  onSync: vi.fn((_cb: any) => () => {}),
  getAllMutations: vi.fn().mockResolvedValue([]),
  removeMutation: vi.fn().mockResolvedValue(undefined),
  updateMutation: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@/lib/offlineQueue", () => ({
  offlineQueue: {
    getPendingCount: () => mockFns.getPendingCount(),
    sync: () => mockFns.sync(),
    onSync: (cb: any) => mockFns.onSync(cb),
    getAllMutations: () => mockFns.getAllMutations(),
    removeMutation: (id: any) => mockFns.removeMutation(id),
    updateMutation: (id: any, data: any) => mockFns.updateMutation(id, data),
  },
}));

// Mock Button component
vi.mock("@/components/ui/Button", () => ({
  Button: ({ children, onClick, disabled, variant, size, className, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));

// Mock lucide icons
vi.mock("lucide-react", () => ({
  WifiOff: () => <span data-testid="wifi-off">📶</span>,
  RefreshCw: () => <span data-testid="refresh">🔄</span>,
  X: () => <span data-testid="x">❌</span>,
  AlertCircle: () => <span data-testid="alert">⚠️</span>,
}));

// Mock toast
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (options: any) => mockToast(options),
}));

// Mock Radix components for Dialog
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}));

// Mock cn utility
vi.mock("@/lib/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("OfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(false);
    mockFns.getPendingCount.mockResolvedValue(0);
  });

  it("renders null when not offline and no pending items", () => {
    const { container } = render(<OfflineBanner />);
    expect(container.firstChild).toBeNull();
  });

  it("shows offline message when offline", async () => {
    mockIsOffline.mockReturnValue(true);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(0);

    render(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    });
  });

  it("shows pending count when offline with pending items", async () => {
    mockIsOffline.mockReturnValue(true);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(5);

    render(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText(/5 pending/)).toBeInTheDocument();
    });
  });

  it("shows pending sync message when online with pending items", async () => {
    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(3);

    render(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText(/3 changes waiting to sync/)).toBeInTheDocument();
    });
  });

  it("shows sync now button when online with pending items", async () => {
    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(3);

    render(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText("Sync Now")).toBeInTheDocument();
    });
  });

  it("calls sync when sync button is clicked", async () => {
    const user = userEvent.setup();
    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(3);
    mockFns.sync.mockResolvedValue(undefined);

    render(<OfflineBanner />);

    const syncButton = await screen.findByText("Sync Now");
    await user.click(syncButton);

    expect(mockFns.sync).toHaveBeenCalled();
  });

  it("calls dismissBanner when dismiss button is clicked", async () => {
    const user = userEvent.setup();
    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(0);

    render(<OfflineBanner />);

    const dismissButton = await screen.findByLabelText("Dismiss banner");
    await user.click(dismissButton);

    expect(mockDismissBanner).toHaveBeenCalled();
  });

  it("does not show dismiss button when offline", async () => {
    mockIsOffline.mockReturnValue(true);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(0);

    render(<OfflineBanner />);

    await waitFor(() => {
      expect(screen.getByText(/You are offline/)).toBeInTheDocument();
    });

    expect(screen.queryByLabelText("Dismiss banner")).not.toBeInTheDocument();
  });

  it("subscribes to sync status updates", () => {
    render(<OfflineBanner />);

    expect(mockFns.onSync).toHaveBeenCalled();
  });

  it("updates state when onSync callback is fired", async () => {
    let syncCb: any;
    mockFns.onSync.mockImplementation((cb: any) => {
      syncCb = cb;
      return () => {};
    });

    mockIsOffline.mockReturnValue(false);
    mockShowBanner.mockReturnValue(true);
    mockFns.getPendingCount.mockResolvedValue(3);

    render(<OfflineBanner />);

    await waitFor(() => expect(screen.getByText("Sync Now")).toBeInTheDocument());

    await act(async () => {
      syncCb("syncing");
    });

    expect(screen.getByText("Syncing...")).toBeDisabled();

    await act(async () => {
      syncCb("done");
    });

    expect(mockFns.getPendingCount).toHaveBeenCalledTimes(2); // Initial + onSync
  });
});

import { ConflictResolutionDialog } from "../OfflineBanner";

describe("ConflictResolutionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders null or no conflicts message when empty", async () => {
    mockFns.getAllMutations.mockResolvedValue([]);
    render(<ConflictResolutionDialog open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("No Conflicts")).toBeInTheDocument();
    });
  });

  it("shows conflicts and handles retry", async () => {
    const user = userEvent.setup();
    const conflicts = [{ id: "1", type: "createOrder", error: "Validation Error" }];
    mockFns.getAllMutations.mockResolvedValue(conflicts);
    mockFns.sync.mockResolvedValue({ success: 1, failed: 0 });

    render(<ConflictResolutionDialog open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Validation Error")).toBeInTheDocument();
    });

    const retryBtn = screen.getByText("Retry");
    await user.click(retryBtn);

    expect(mockFns.updateMutation).toHaveBeenCalledWith(
      "1",
      expect.objectContaining({ error: undefined })
    );
    expect(mockFns.sync).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Changes synced successfully" })
    );
  });

  it("handles discard", async () => {
    const user = userEvent.setup();
    const conflicts = [{ id: "1", type: "createOrder", error: "Fatal Error" }];
    mockFns.getAllMutations.mockResolvedValue(conflicts);

    render(<ConflictResolutionDialog open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Fatal Error")).toBeInTheDocument();
    });

    const discardBtn = screen.getByText("Discard");
    await user.click(discardBtn);

    expect(mockFns.removeMutation).toHaveBeenCalledWith("1");
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Change discarded" }));
  });

  it("handles discard all", async () => {
    const user = userEvent.setup();
    const conflicts = [
      { id: "1", type: "createOrder", error: "Error 1" },
      { id: "2", type: "updateOrder", error: "Error 2" },
    ];
    mockFns.getAllMutations.mockResolvedValue(conflicts);

    render(<ConflictResolutionDialog open={true} onClose={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Discard All Changes")).toBeInTheDocument();
    });

    const discardAllBtn = screen.getByText("Discard All Changes");
    await user.click(discardAllBtn);

    expect(mockFns.removeMutation).toHaveBeenCalledTimes(2);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "All changes discarded" })
    );
  });
});
