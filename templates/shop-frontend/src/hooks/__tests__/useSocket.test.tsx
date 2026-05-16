// @vitest-environment jsdom
/**
 * @vitest-environment jsdom
 */
/**
 * Unit tests for src/hooks/useSocket.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSocketEvent, useSocketRoom, useSocketStatus } from "../useSocket";

const mockOn = vi.fn(),
  mockJoinRoom = vi.fn(),
  mockLeaveRoom = vi.fn();
const mockIsConnected = vi.fn(),
  mockConnect = vi.fn();

vi.mock("@/lib/socket", () => ({
  socketClient: {
    on: (...a: any[]) => mockOn(...a),
    joinRoom: (...a: any[]) => mockJoinRoom(...a),
    leaveRoom: (...a: any[]) => mockLeaveRoom(...a),
    isConnected: () => mockIsConnected(),
    connect: (...a: any[]) => mockConnect(...a),
  },
  WebSocketEvent: {},
}));

const mockGetItem = vi.fn();
Object.defineProperty(window, "localStorage", {
  value: { getItem: (...a: any[]) => mockGetItem(...a) },
  writable: true,
});

describe("useSocketEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("subscribes to socket event on mount", () => {
    const unsub = vi.fn();
    mockOn.mockReturnValue(unsub);
    renderHook(() => useSocketEvent("message" as any, vi.fn()));
    expect(mockOn).toHaveBeenCalled();
  });

  it("unsubscribes on unmount", () => {
    const unsub = vi.fn();
    mockOn.mockReturnValue(unsub);
    const { unmount } = renderHook(() => useSocketEvent("message" as any, vi.fn()));
    unmount();
    expect(unsub).toHaveBeenCalled();
  });
});

describe("useSocketRoom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("joins room on mount", () => {
    renderHook(() => useSocketRoom("general"));
    expect(mockJoinRoom).toHaveBeenCalledWith("general");
  });

  it("leaves room on unmount", () => {
    const { unmount } = renderHook(() => useSocketRoom("general"));
    unmount();
    expect(mockLeaveRoom).toHaveBeenCalledWith("general");
  });
});

describe("useSocketStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns connected status", () => {
    mockIsConnected.mockReturnValue(true);
    const { result } = renderHook(() => useSocketStatus());
    expect(result.current.isConnected).toBe(true);
  });

  it("returns disconnected status", () => {
    mockIsConnected.mockReturnValue(false);
    const { result } = renderHook(() => useSocketStatus());
    expect(result.current.isConnected).toBe(false);
  });

  it("reconnects with token from localStorage", () => {
    mockGetItem.mockReturnValue("test-token");
    mockIsConnected.mockReturnValue(false);
    const { result } = renderHook(() => useSocketStatus());
    result.current.reconnect();
    expect(mockConnect).toHaveBeenCalledWith("test-token");
  });

  it("reconnects with null when no token", () => {
    mockGetItem.mockReturnValue(null);
    const { result } = renderHook(() => useSocketStatus());
    result.current.reconnect();
    expect(mockConnect).toHaveBeenCalledWith(null);
  });
});
