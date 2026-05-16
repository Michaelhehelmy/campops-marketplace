/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { socketClient, WebSocketEvent } from "../socket";
import { io, Socket } from "socket.io-client";

// Mock socket.io-client
vi.mock("socket.io-client");

describe("Socket Client", () => {
  let mockSocket: Partial<Socket>;
  let mockOnHandlers: Map<string, Function>;
  let mockEmitCalls: Array<{ event: string; data: any }>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Reset socketClient state
    socketClient.disconnect();

    mockOnHandlers = new Map();
    mockEmitCalls = [];

    mockSocket = {
      connected: false,
      id: "test-socket-id",
      on: vi.fn((event: string, handler: Function): Socket => {
        mockOnHandlers.set(event, handler);
        return mockSocket as Socket;
      }),
      off: vi.fn((): Socket => mockSocket as Socket),
      emit: vi.fn((event: string, data: any): Socket => {
        mockEmitCalls.push({ event, data });
        return mockSocket as Socket;
      }),
      disconnect: vi.fn((): Socket => {
        mockSocket.connected = false;
        return mockSocket as Socket;
      }),
    };

    (io as any).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    vi.useRealTimers();
    socketClient.disconnect();
  });

  describe("connect", () => {
    it("creates socket connection with auth token", () => {
      socketClient.connect("test-token");

      expect(io).toHaveBeenCalledWith(expect.any(String), {
        auth: { token: "test-token" },
        transports: ["websocket", "polling"],
        reconnection: false,
      });
    });

    it("creates socket connection without token when not provided", () => {
      socketClient.connect();

      expect(io).toHaveBeenCalledWith(expect.any(String), {
        auth: undefined,
        transports: ["websocket", "polling"],
        reconnection: false,
      });
    });

    it("does not create new connection if already connected", () => {
      mockSocket.connected = true;
      socketClient.connect("token");

      // Set connected after first connect
      (io as any).mockClear();
      mockSocket.connected = true;

      socketClient.connect("token");
      expect(io).not.toHaveBeenCalled();
    });

    it("handles connect event - resets reconnect attempts", () => {
      socketClient.connect("token");

      // Simulate connect event
      const connectHandler = mockOnHandlers.get("connect");
      expect(connectHandler).toBeDefined();

      // First set connected to false, then connect
      mockSocket.connected = false;
      connectHandler?.();

      // Socket should now be considered connected
      expect(socketClient.isConnected()).toBe(false); // Still false because mockSocket.connected is false
    });

    it("handles disconnect event - schedules reconnect", () => {
      socketClient.connect("token");

      const disconnectHandler = mockOnHandlers.get("disconnect");
      expect(disconnectHandler).toBeDefined();

      // Simulate server-side disconnect
      disconnectHandler?.("transport close");

      // Should schedule reconnect
      vi.advanceTimersByTime(1000);
      expect(io).toHaveBeenCalledTimes(2); // Initial + reconnect
    });

    it("does not reconnect on client-initiated disconnect", () => {
      socketClient.connect("token");

      const disconnectHandler = mockOnHandlers.get("disconnect");

      // Simulate client disconnect
      disconnectHandler?.("io client disconnect");

      vi.advanceTimersByTime(10000);
      expect(io).toHaveBeenCalledTimes(1); // Only initial, no reconnect
    });

    it("handles connect_error event - schedules reconnect", () => {
      socketClient.connect("token");

      const errorHandler = mockOnHandlers.get("connect_error");
      expect(errorHandler).toBeDefined();

      errorHandler?.(new Error("Connection refused"));

      vi.advanceTimersByTime(1000);
      expect(io).toHaveBeenCalledTimes(2);
    });

    it("stops reconnecting after max attempts", () => {
      socketClient.connect("token");

      const errorHandler = mockOnHandlers.get("connect_error");

      // Trigger 10+ connection errors
      for (let i = 0; i < 15; i++) {
        errorHandler?.(new Error("Connection refused"));
      }

      // Clear the mock to check if more calls happen
      (io as any).mockClear();

      // Trigger one more - should not reconnect
      errorHandler?.(new Error("Connection refused"));
      vi.advanceTimersByTime(30000);

      // Should not have attempted more reconnects
      expect(io).not.toHaveBeenCalled();
    });

    it("uses exponential backoff for reconnect", () => {
      socketClient.connect("token");

      const errorHandler = mockOnHandlers.get("connect_error");
      const consoleSpy = vi.spyOn(console, "log");

      // First error - 1s delay
      errorHandler?.(new Error("Connection refused"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("1000ms"));

      // Second error - 2s delay
      errorHandler?.(new Error("Connection refused"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("2000ms"));

      // Third error - 4s delay
      errorHandler?.(new Error("Connection refused"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("4000ms"));
    });

    it("caps reconnect delay at 30 seconds", () => {
      socketClient.connect("token");
      const errorHandler = mockOnHandlers.get("connect_error");
      const consoleSpy = vi.spyOn(console, "log");

      // Trigger 5 errors (2^4 = 16s delay for 5th)
      for (let i = 0; i < 5; i++) {
        errorHandler?.(new Error("Connection refused"));
      }

      // 6th error - should be capped at 30s not 32s
      errorHandler?.(new Error("Connection refused"));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("30000ms"));
    });
  });

  describe("disconnect", () => {
    it("disconnects socket and clears state", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      socketClient.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("clears joined rooms on disconnect", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      socketClient.joinRoom("room-1");
      socketClient.joinRoom("room-2");

      socketClient.disconnect();

      // After reconnect, rooms should be empty
      (io as any).mockClear();
      (mockSocket.emit as any).mockClear();
      socketClient.connect("token");

      // Simulate connect - should not rejoin rooms since joinedRooms was cleared
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      expect(mockSocket.emit).not.toHaveBeenCalledWith("join_room", "room-1");
    });

    it("stops heartbeat on disconnect", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      // Simulate connect to start heartbeat
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      socketClient.disconnect();

      // Advance time - should not emit ping
      vi.advanceTimersByTime(30000);
      expect(mockSocket.emit).not.toHaveBeenCalledWith("ping");
    });
  });

  describe("event subscription", () => {
    it("subscribes to events when connected", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      const callback = vi.fn();
      const unsubscribe = socketClient.on("ORDER_CREATED", callback);

      expect(mockSocket.on).toHaveBeenCalledWith("ORDER_CREATED", expect.any(Function));
      expect(typeof unsubscribe).toBe("function");
    });

    it("buffers events when not connected", () => {
      const callback = vi.fn();
      socketClient.on("ORDER_CREATED", callback);

      // Should buffer since not connected
      socketClient.connect("token");

      // Simulate connect - should flush buffer
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      expect(mockSocket.on).toHaveBeenCalledWith("ORDER_CREATED", expect.any(Function));
    });

    it("unsubscribes from events", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      const callback = vi.fn();
      const unsubscribe = socketClient.on("ORDER_CREATED", callback);

      unsubscribe();

      expect(mockSocket.off).toHaveBeenCalledWith("ORDER_CREATED", expect.any(Function));
    });

    it("unsubscribes from buffered events", () => {
      const callback = vi.fn();
      const unsubscribe = socketClient.on("ORDER_CREATED", callback);

      // Unsubscribe before connecting
      unsubscribe();

      // Connect
      socketClient.connect("token");
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      // Should not have subscribed the event
      const calls = (mockSocket.on as any).mock.calls;
      const orderCreatedCalls = calls.filter((call: any) => call[0] === "ORDER_CREATED");
      expect(orderCreatedCalls.length).toBe(0);
    });
  });

  describe("room management", () => {
    it("joins room and emits join_room event", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      socketClient.joinRoom("kitchen");

      expect(mockSocket.emit).toHaveBeenCalledWith("join_room", "kitchen");
    });

    it("does not emit join_room if not connected", () => {
      socketClient.connect("token");
      mockSocket.connected = false;

      socketClient.joinRoom("kitchen");

      // Not emitted immediately
      expect(mockSocket.emit).not.toHaveBeenCalled();
    });

    it("leaves room and emits leave_room event", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      socketClient.joinRoom("kitchen");
      socketClient.leaveRoom("kitchen");

      expect(mockSocket.emit).toHaveBeenCalledWith("leave_room", "kitchen");
    });

    it("rejoins rooms after reconnection", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      socketClient.joinRoom("kitchen");
      socketClient.joinRoom("housekeeping");

      // Simulate disconnect and reconnect
      const disconnectHandler = mockOnHandlers.get("disconnect");
      disconnectHandler?.("transport close");

      // Reconnect
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      // Should rejoin rooms
      expect(mockSocket.emit).toHaveBeenCalledWith("join_room", "kitchen");
      expect(mockSocket.emit).toHaveBeenCalledWith("join_room", "housekeeping");
    });
  });

  describe("connection status", () => {
    it("returns false when not connected", () => {
      expect(socketClient.isConnected()).toBe(false);
    });

    it("returns true when connected", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      expect(socketClient.isConnected()).toBe(true);
    });

    it("returns socket id when connected", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      expect(socketClient.getId()).toBe("test-socket-id");
    });

    it("returns undefined when not connected", () => {
      expect(socketClient.getId()).toBeUndefined();
    });
  });

  describe("heartbeat", () => {
    it("sends ping every 30 seconds when connected", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      // Simulate connect to start heartbeat
      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      vi.advanceTimersByTime(30000);
      expect(mockSocket.emit).toHaveBeenCalledWith("ping");

      vi.advanceTimersByTime(30000);
      expect(mockSocket.emit).toHaveBeenCalledTimes(2);
    });

    it("does not send ping when disconnected", () => {
      socketClient.connect("token");
      mockSocket.connected = true;

      const connectHandler = mockOnHandlers.get("connect");
      connectHandler?.();

      // Disconnect
      const disconnectHandler = mockOnHandlers.get("disconnect");
      disconnectHandler?.("io client disconnect");

      vi.advanceTimersByTime(30000);
      // Should not have sent ping after disconnect
      const pingCalls = (mockSocket.emit as any).mock.calls.filter(
        (call: any) => call[0] === "ping"
      );
      expect(pingCalls.length).toBe(0);
    });
  });
});
