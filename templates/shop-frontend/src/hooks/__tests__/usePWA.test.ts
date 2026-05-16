// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/usePWA.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePWA, useOfflineBanner } from "../usePWA";

// Mock the toast hook
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: any[]) => mockToast(...args),
}));

// Mock the branding context
vi.mock("@/contexts/BrandingContext", () => ({
  useBranding: () => ({ appName: "TestApp" }),
}));

describe("usePWA", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock navigator safely using stubGlobal WITHOUT spreading
    vi.stubGlobal("navigator", {
      onLine: true,
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue(null),
        ready: new Promise(() => {}),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      userAgent: "test",
      language: "en-US",
    });

    // Mock matchMedia
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));

    // Mock MessageChannel
    vi.stubGlobal("MessageChannel", function (this: any) {
      this.port1 = { postMessage: vi.fn(), onmessage: null as any };
      this.port2 = { postMessage: vi.fn(), onmessage: null as any };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns correct initial status", async () => {
    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current.isOffline).toBe(false);
  });

  it("updates isOffline when going offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current.isOffline).toBe(true));

    act(() => {
      vi.stubGlobal("navigator", { onLine: true });
      window.dispatchEvent(new Event("online"));
    });
    await waitFor(() => expect(result.current.isOffline).toBe(false));
  });

  it("handles successful installation", async () => {
    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current).not.toBeNull());

    const mockPrompt = vi.fn();
    const deferredPrompt = {
      preventDefault: vi.fn(),
      prompt: mockPrompt,
      userChoice: Promise.resolve({ outcome: "accepted" }),
    };

    act(() => {
      window.dispatchEvent(Object.assign(new Event("beforeinstallprompt"), deferredPrompt));
    });

    await waitFor(() => expect(result.current.isInstallable).toBe(true));

    await act(async () => {
      await result.current.install();
    });

    expect(mockPrompt).toHaveBeenCalled();
  });

  it("handles appinstalled event", async () => {
    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current).not.toBeNull());

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });

    await waitFor(() => expect(result.current.isInstalled).toBe(true));
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "App Installed" }));
  });

  it("detects standalone mode via matchMedia", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query) => ({
        matches: query === "(display-mode: standalone)",
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );

    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current.isStandalone).toBe(true));
  });

  it("handles checkForUpdates", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi.fn().mockResolvedValue({ update: mockUpdate }),
      },
      onLine: true,
    });

    const { result } = renderHook(() => usePWA());
    await act(async () => {
      await result.current.checkForUpdates();
    });

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Checking for Updates" })
    );
  });

  it("handles clearCache success", async () => {
    const postMessageMock = vi.fn();
    const readyMock = Promise.resolve({
      active: { postMessage: postMessageMock },
      getRegistration: vi.fn().mockResolvedValue(null),
    });

    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: readyMock,
        getRegistration: vi.fn().mockResolvedValue(null),
      },
      onLine: true,
    });

    // Mock MessageChannel for success
    let port1OnMessage: any = null;
    const mockPort2PostMessage = vi.fn();
    vi.stubGlobal("MessageChannel", function (this: any) {
      this.port1 = {
        get onmessage() {
          return port1OnMessage;
        },
        set onmessage(val) {
          port1OnMessage = val;
        },
      };
      this.port2 = { postMessage: mockPort2PostMessage };
    });

    const { result } = renderHook(() => usePWA());

    // We need to wait for the hook to be ready
    await waitFor(() => expect(result.current).not.toBeNull());

    const promise = result.current.clearCache();

    // Give it a microtick to reach the promise
    await Promise.resolve();
    await Promise.resolve();

    // Simulate success response
    if (port1OnMessage) {
      port1OnMessage({ data: { success: true } });
    }

    await promise;

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: "CLEAR_CACHES" }),
      expect.any(Array)
    );
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Cache Cleared" }));
  });

  it("handles clearCache timeout and fallback to unregister", async () => {
    // Mock setTimeout to fire immediately
    const originalSetTimeout = global.setTimeout;
    vi.stubGlobal(
      "setTimeout",
      vi.fn((cb, ms) => {
        if (ms === 5000) {
          cb();
          return 0;
        }
        return originalSetTimeout(cb, ms);
      })
    );

    const unregisterMock = vi.fn().mockResolvedValue(true);
    const readyMock = Promise.resolve({
      active: { postMessage: vi.fn() },
      unregister: unregisterMock,
      getRegistration: vi.fn().mockResolvedValue(null),
    });

    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: readyMock,
        getRegistration: vi.fn().mockResolvedValue(null),
      },
      onLine: true,
    });

    vi.stubGlobal("location", { reload: vi.fn() });

    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current).not.toBeNull());

    await act(async () => {
      await result.current.clearCache();
    });

    expect(unregisterMock).toHaveBeenCalled();
    expect(window.location.reload).toHaveBeenCalled();

    vi.unstubAllGlobals(); // Reset setTimeout
  });

  it("handles clearCache error", async () => {
    const error = new Error("Ready failed");
    const readyMock = Promise.reject(error);
    readyMock.catch(() => {}); // Prevent unhandled rejection

    vi.stubGlobal("navigator", {
      serviceWorker: {
        ready: readyMock,
        getRegistration: vi.fn().mockResolvedValue(null),
      },
      onLine: true,
    });

    const { result } = renderHook(() => usePWA());
    await waitFor(() => expect(result.current).not.toBeNull());

    await act(async () => {
      await result.current.clearCache();
    });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error Clearing Cache",
        variant: "destructive",
      })
    );
  });

  it("handles checkForUpdates when not supported", async () => {
    vi.stubGlobal("navigator", {});
    const { result } = renderHook(() => usePWA());
    await act(async () => {
      await result.current.checkForUpdates();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Service Worker Not Available" })
    );
  });

  it("handles checkForUpdates error", async () => {
    vi.stubGlobal("navigator", {
      serviceWorker: {
        getRegistration: vi
          .fn()
          .mockImplementation(() => Promise.reject(new Error("Update failed"))),
      },
    });
    const { result } = renderHook(() => usePWA());
    await act(async () => {
      try {
        await result.current.checkForUpdates();
      } catch (e) {}
    });
    // Just ensures no crash
  });

  it("dismisses banner in usePWA", () => {
    const { result } = renderHook(() => usePWA());
    act(() => {
      result.current.dismissBanner();
    });
  });
});

describe("useOfflineBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("navigator", { onLine: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns correct initial state when offline", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOfflineBanner());
    await waitFor(() => {
      expect(result.current.isOffline).toBe(true);
      expect(result.current.showBanner).toBe(true);
    });
  });

  it("hides banner after delay when coming online", async () => {
    const originalSetTimeout = global.setTimeout;
    vi.spyOn(global, "setTimeout").mockImplementation((cb: any, ms?: number) => {
      return originalSetTimeout(cb, ms === 3000 ? 10 : ms);
    });

    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOfflineBanner());
    await waitFor(() => expect(result.current.isOffline).toBe(true));

    act(() => {
      vi.stubGlobal("navigator", { onLine: true });
      window.dispatchEvent(new Event("online"));
    });

    await waitFor(() => expect(result.current.isOffline).toBe(false));
    await waitFor(() => expect(result.current.showBanner).toBe(false));
  });

  it("allows manual dismissal of banner", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const { result } = renderHook(() => useOfflineBanner());
    await waitFor(() => expect(result.current.showBanner).toBe(true));

    act(() => {
      result.current.dismissBanner();
    });

    expect(result.current.showBanner).toBe(false);
  });
});
