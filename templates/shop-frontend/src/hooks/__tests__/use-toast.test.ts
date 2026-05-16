// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useToast, toast } from "../use-toast";

describe("useToast", () => {
  beforeEach(() => {
    // Clear all toasts before each test
    const { dismiss } = renderHook(() => useToast()).result.current;
    act(() => {
      dismiss();
    });
  });

  it("adds a toast", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Test Toast" });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe("Test Toast");
  });

  it("updates a toast", () => {
    const { result } = renderHook(() => useToast());

    let t: any;
    act(() => {
      t = toast({ title: "Original" });
    });

    act(() => {
      t.update({ id: t.id, title: "Updated" });
    });

    expect(result.current.toasts[0].title).toBe("Updated");
  });

  it("dismisses a toast by id", () => {
    const { result } = renderHook(() => useToast());

    let t: any;
    act(() => {
      t = toast({ title: "To Dismiss" });
    });

    act(() => {
      t.dismiss();
    });

    // Dismiss sets open to false, then it's removed after a delay
    expect(result.current.toasts[0].open).toBe(false);
  });

  it("dismisses all toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: "Toast 1" });
    });

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts.every((t) => !t.open)).toBe(true);
  });

  it("removes toast after delay", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      const t = toast({ title: "Delayed Remove" });
      t.dismiss();
    });

    act(() => {
      vi.advanceTimersByTime(1000000);
    });

    expect(result.current.toasts.length).toBe(0);
    vi.useRealTimers();
  });
});
