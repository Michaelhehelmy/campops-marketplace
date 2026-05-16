/**
 * React hooks for WebSocket integration
 */

import { useEffect, useCallback } from "react";
import { socketClient, type WebSocketEvent } from "@/lib/socket";

/**
 * Hook to subscribe to WebSocket events
 * @param event - WebSocket event name
 * @param callback - Event handler function
 */
export function useSocketEvent<T = unknown>(
  event: WebSocketEvent,
  callback: (payload: T) => void
): void {
  useEffect(() => {
    const unsubscribe = socketClient.on<T>(event, callback);
    return unsubscribe;
  }, [event, callback]);
}

/**
 * Hook to manage room subscriptions
 * @param room - Room name to join
 */
export function useSocketRoom(room: string): void {
  useEffect(() => {
    socketClient.joinRoom(room);
    return () => {
      socketClient.leaveRoom(room);
    };
  }, [room]);
}

/**
 * Hook to check WebSocket connection status
 * @returns Connection state and reconnect function
 */
export function useSocketStatus(): {
  isConnected: boolean;
  reconnect: () => void;
} {
  const isConnected = socketClient.isConnected();

  const reconnect = useCallback(() => {
    const token = localStorage.getItem("token");
    socketClient.connect(token);
  }, []);

  return { isConnected, reconnect };
}
