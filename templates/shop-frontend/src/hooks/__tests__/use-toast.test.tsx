// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/use-toast.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { reducer, useToast, toast } from "../use-toast";

describe("toast reducer", () => {
  it("handles ADD_TOAST", () => {
    const state = { toasts: [] };
    const newToast = { id: "1", title: "Test", open: true };
    const result = reducer(state, { type: "ADD_TOAST", toast: newToast as any });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("1");
  });

  it("limits toasts to TOAST_LIMIT", () => {
    const state = { toasts: [{ id: "1", title: "First", open: true } as any] };
    const newToast = { id: "2", title: "Second", open: true };
    const result = reducer(state, { type: "ADD_TOAST", toast: newToast as any });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("2");
  });

  it("handles UPDATE_TOAST", () => {
    const state = { toasts: [{ id: "1", title: "Old", open: true } as any] };
    const result = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "New" },
    });
    expect(result.toasts[0].title).toBe("New");
    expect(result.toasts[0].open).toBe(true);
  });

  it("handles DISMISS_TOAST with specific id", () => {
    const state = { toasts: [{ id: "1", title: "Test", open: true } as any] };
    const result = reducer(state, { type: "DISMISS_TOAST", toastId: "1" });
    expect(result.toasts[0].open).toBe(false);
  });

  it("handles DISMISS_TOAST without id (dismiss all)", () => {
    const state = {
      toasts: [
        { id: "1", title: "First", open: true } as any,
        { id: "2", title: "Second", open: true } as any,
      ],
    };
    const result = reducer(state, { type: "DISMISS_TOAST" });
    expect(result.toasts.every((t) => !t.open)).toBe(true);
  });

  it("handles REMOVE_TOAST with specific id", () => {
    const state = {
      toasts: [{ id: "1", title: "First" } as any, { id: "2", title: "Second" } as any],
    };
    const result = reducer(state, { type: "REMOVE_TOAST", toastId: "1" });
    expect(result.toasts).toHaveLength(1);
    expect(result.toasts[0].id).toBe("2");
  });

  it("handles REMOVE_TOAST without id (remove all)", () => {
    const state = {
      toasts: [{ id: "1", title: "First" } as any, { id: "2", title: "Second" } as any],
    };
    const result = reducer(state, { type: "REMOVE_TOAST" });
    expect(result.toasts).toHaveLength(0);
  });
});

describe("useToast", () => {
  beforeEach(() => {
    // Clear memory state
    const { result } = renderHook(() => useToast());
    result.current.toasts.forEach((t) => {
      act(() => {
        result.current.dismiss(t.id);
      });
    });
  });

  it("returns initial state with empty toasts", () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it("can toast and dismiss", () => {
    const { result } = renderHook(() => useToast());

    let toastResult: any;
    act(() => {
      toastResult = result.current.toast({ title: "Test Toast" });
    });

    expect(toastResult.id).toBeDefined();
    expect(toastResult.dismiss).toBeInstanceOf(Function);
    expect(toastResult.update).toBeInstanceOf(Function);

    // Dismiss the toast
    act(() => {
      toastResult.dismiss();
    });
  });

  it("can dismiss all toasts", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Toast 1" });
      result.current.toast({ title: "Toast 2" });
    });

    act(() => {
      result.current.dismiss();
    });
  });
});

describe("toast function", () => {
  it("creates a toast with unique id", () => {
    const t1 = toast({ title: "First" });
    const t2 = toast({ title: "Second" });
    expect(t1.id).not.toBe(t2.id);
  });

  it("returns dismiss function", () => {
    const t = toast({ title: "Test" });
    expect(t.dismiss).toBeInstanceOf(Function);
    // Call dismiss without error
    act(() => {
      t.dismiss();
    });
  });

  it("returns update function", () => {
    const t = toast({ title: "Test" });
    expect(t.update).toBeInstanceOf(Function);
  });
});
