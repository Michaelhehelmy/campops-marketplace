/**
 * WebSocket client with Socket.io
 * Handles connection, reconnection, and room management
 */

import { io, Socket } from "socket.io-client";

const WS_URL =
  import.meta.env.VITE_WS_URL || (typeof window !== "undefined" ? window.location.origin : "");

/**
 * WebSocket event types
 */
export type WebSocketEvent =
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_READY"
  | "RESERVATION_UPDATED"
  | "ROOM_STATUS_UPDATED"
  | "ROOM_CREATED"
  | "ROOM_UPDATED"
  | "LOW_STOCK_ALERT"
  | "POS_ITEM_CREATED"
  | "POS_ITEM_UPDATED"
  | "POS_ITEM_DELETED"
  | "POS_ITEM_LOW_STOCK"
  | "PAYMENT_RECEIVED"
  | "PAGE_PUBLISHED"
  | "PAGE_UPDATED"
  | "PAGE_DELETED"
  | "connect"
  | "disconnect"
  | "connect_error";

/**
 * Socket.io client singleton
 */
class SocketClient {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private joinedRooms: Set<string> = new Set();

  /**
   * Connect to WebSocket server
   */
  connect(token?: string | null): void {
    if (this.socket?.connected) return;

    this.socket = io(WS_URL, {
      auth: token ? { token } : undefined,
      transports: ["websocket", "polling"],
      reconnection: false, // We handle reconnection manually
    });

    this.socket.on("connect", () => {
      console.log("WebSocket connected");
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      // Flush event buffer
      this.eventBuffer.forEach(({ event, callback }) => {
        this.socket?.on(event, callback);
      });
      this.eventBuffer = [];

      // Rejoin rooms after reconnection
      this.joinedRooms.forEach((room) => {
        this.socket?.emit("join_room", room);
      });
    });

    this.socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      this.stopHeartbeat();

      if (reason !== "io client disconnect") {
        this.scheduleReconnect(token);
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      this.scheduleReconnect(token);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.socket?.disconnect();
    this.socket = null;
    this.joinedRooms.clear();
    this.reconnectAttempts = 0;
  }

  private eventBuffer: Array<{ event: WebSocketEvent; callback: (payload: any) => void }> = [];

  /**
   * Subscribe to a WebSocket event
   */
  on<T = unknown>(event: WebSocketEvent, callback: (payload: T) => void): () => void {
    if (this.socket) {
      this.socket.on(event, callback as (payload: unknown) => void);
    } else {
      this.eventBuffer.push({ event, callback });
    }

    return () => {
      if (this.socket) {
        this.socket.off(event, callback as (payload: unknown) => void);
      } else {
        this.eventBuffer = this.eventBuffer.filter(
          (item) => item.event !== event || item.callback !== callback
        );
      }
    };
  }

  /**
   * Join a room for targeted updates
   */
  joinRoom(room: string): void {
    this.joinedRooms.add(room);
    if (this.isConnected()) {
      this.socket?.emit("join_room", room);
    }
  }

  /**
   * Leave a room
   */
  leaveRoom(room: string): void {
    this.joinedRooms.delete(room);
    if (this.isConnected()) {
      this.socket?.emit("leave_room", room);
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Get socket ID
   */
  getId(): string | undefined {
    return this.socket?.id;
  }

  private scheduleReconnect(token?: string | null): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      return;
    }

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token);
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit("ping");
      }
    }, 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

/**
 * WebSocket client singleton instance
 */
export const socketClient = new SocketClient();
