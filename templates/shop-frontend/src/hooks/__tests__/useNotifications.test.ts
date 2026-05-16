// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/useNotifications.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useNotifications, useRequestNotificationsOnMount } from "../useNotifications";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

describe("useNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    class MockNotification {
      static permission = "default";
      static requestPermission = vi.fn().mockResolvedValue("granted");

      close = vi.fn();
      onclick = null;
      tag = "";

      constructor(
        public title: string,
        public options: any = {}
      ) {
        this.tag = options.tag || "";
        MockNotification.lastInstance = this;
      }

      static lastInstance: MockNotification | null = null;
    }

    vi.stubGlobal("Notification", MockNotification);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns isSupported=true and correct permission", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));
    expect(result.current.isSupported).toBe(true);
  });

  it("requests permission and updates state", async () => {
    (Notification as any).requestPermission.mockResolvedValue("granted");
    const { result } = renderHook(() => useNotifications());

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.requestPermission();
    });

    expect(res).toBe(true);
    expect(result.current.permission).toBe("granted");
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Notifications enabled" })
    );
  });

  it("handles denied permission", async () => {
    (Notification as any).requestPermission.mockResolvedValue("denied");
    const { result } = renderHook(() => useNotifications());

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.requestPermission();
    });

    expect(res).toBe(false);
    expect(result.current.permission).toBe("denied");
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });

  it("handles notification click and navigation", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    const onClickMock = vi.fn();
    act(() => {
      result.current.showNotification({
        title: "Test",
        onClick: onClickMock,
      });
    });

    const instance = (Notification as any).lastInstance;
    expect(instance).not.toBeNull();

    await waitFor(() => expect(instance.onclick).toBeTypeOf("function"));

    act(() => {
      instance.onclick();
    });

    expect(instance.close).toHaveBeenCalled();
    expect(onClickMock).toHaveBeenCalled();
  });

  it("shows order ready notification", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showOrderReadyNotification("ORDER-12345", "5");
    });

    const instance = (Notification as any).lastInstance;
    expect(instance.options.body).toContain("Order #2345");
    expect(instance.options.body).toContain("Table 5");
  });

  it("shows low stock notification", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showLowStockNotification("Coffee", 2, 5);
    });

    const instance = (Notification as any).lastInstance;
    expect(instance.options.body).toContain("Coffee");
    expect(instance.options.body).toContain("2 remaining");
    expect(instance.options.requireInteraction).toBe(true);
  });

  it("shows system notification", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showSystemNotification("Alert", "System update");
    });

    const instance = (Notification as any).lastInstance;
    expect(instance.title).toBe("Alert");
    expect(instance.options.body).toBe("System update");
  });

  it("closes existing notification with same tag", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showNotification({ title: "First", tag: "same-tag" });
    });

    const firstInstance = (Notification as any).lastInstance;

    act(() => {
      result.current.showNotification({ title: "Second", tag: "same-tag" });
    });

    expect(firstInstance.close).toHaveBeenCalled();
  });

  it("handles requestPermission error", async () => {
    (Notification as any).requestPermission.mockRejectedValue(new Error("Request failed"));
    const { result } = renderHook(() => useNotifications());

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.requestPermission();
    });

    expect(res).toBe(false);
  });

  it("handles requestPermission when not supported", async () => {
    vi.stubGlobal("Notification", undefined);
    const { result } = renderHook(() => useNotifications());

    let res: boolean | undefined;
    await act(async () => {
      res = await result.current.requestPermission();
    });

    expect(res).toBe(false);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Notifications not supported" })
    );
  });

  it("falls back to toast when not supported", async () => {
    vi.stubGlobal("Notification", undefined);
    const { result } = renderHook(() => useNotifications());

    act(() => {
      const res = result.current.showNotification({ title: "Toast only" });
      expect(res).toBe(false);
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Toast only" }));
  });

  it("handles navigation on click for order ready notification", async () => {
    const locationStub = { href: "" };
    vi.stubGlobal("location", locationStub);
    (Notification as any).permission = "granted";

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showOrderReadyNotification("ORDER-12345");
    });

    const instance = (Notification as any).lastInstance;
    act(() => {
      instance.onclick();
    });

    expect(locationStub.href).toBe("/orders");
  });

  it("handles navigation on click for low stock notification", async () => {
    const locationStub = { href: "" };
    vi.stubGlobal("location", locationStub);
    (Notification as any).permission = "granted";

    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    act(() => {
      result.current.showLowStockNotification("Coffee", 2, 5);
    });

    const instance = (Notification as any).lastInstance;
    act(() => {
      instance.onclick();
    });

    expect(locationStub.href).toBe("/admin/inventory");
  });

  it("handles error in showNotification and falls back to toast", async () => {
    (Notification as any).permission = "granted";
    const { result } = renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.permission).toBe("granted"));

    // Force an error in the Notification constructor or logic
    vi.stubGlobal(
      "Notification",
      vi.fn().mockImplementation(() => {
        throw new Error("Failed to create notification");
      })
    );

    act(() => {
      const res = result.current.showNotification({ title: "Error Test", body: "Error Message" });
      expect(res).toBe(false);
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error Test",
        description: "Error Message",
      })
    );
  });
});

describe("useRequestNotificationsOnMount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    class MockNotification {
      static permission = "default";
      static requestPermission = vi.fn().mockResolvedValue("granted");
    }
    vi.stubGlobal("Notification", MockNotification);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("requests permission after delay", async () => {
    renderHook(() => useRequestNotificationsOnMount(true));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(Notification.requestPermission).toHaveBeenCalled();
  });

  it("does not request if disabled", async () => {
    renderHook(() => useRequestNotificationsOnMount(false));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("does not request if already granted", async () => {
    (Notification as any).permission = "granted";
    renderHook(() => useRequestNotificationsOnMount(true));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });

  it("does not request if already denied", async () => {
    (Notification as any).permission = "denied";
    renderHook(() => useRequestNotificationsOnMount(true));

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(Notification.requestPermission).not.toHaveBeenCalled();
  });
});
