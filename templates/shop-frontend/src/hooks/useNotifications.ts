/**
 * Browser Notifications Hook
 * Handles notification permissions and displaying notifications
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "@/hooks/use-toast";

// Notification permission status
type NotificationPermission = "default" | "granted" | "denied";

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  onClick?: () => void;
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const notificationRef = useRef<Notification | null>(null);

  // Check support and current permission on mount
  useEffect(() => {
    if (typeof window !== "undefined" && window.Notification) {
      setIsSupported(true);
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  /**
   * Request notification permission from the user
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Notifications not supported",
        description: "Your browser doesn't support notifications",
        variant: "destructive",
      });
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);

      if (result === "granted") {
        toast({ title: "Notifications enabled" });
        return true;
      } else if (result === "denied") {
        toast({
          title: "Notifications denied",
          description: "You can enable them in your browser settings",
          variant: "destructive",
        });
        return false;
      }
      return false;
    } catch (error) {
      console.error("[NOTIFICATIONS] Error requesting permission:", error);
      return false;
    }
  }, [isSupported]);

  /**
   * Show a browser notification
   * Falls back to toast if permission denied or not supported
   */
  const showNotification = useCallback(
    (options: NotificationOptions): boolean => {
      const { title, body, icon, tag, requireInteraction, onClick } = options;

      // If permission not granted, fall back to toast
      if (!isSupported || permission !== "granted") {
        toast({
          title,
          description: body,
        });
        return false;
      }

      try {
        // Close existing notification with same tag (prevent duplicates)
        if (tag && notificationRef.current?.tag === tag) {
          notificationRef.current.close();
        }

        const notification = new Notification(title, {
          body,
          icon: icon || "/icon-192x192.png", // Default PWA icon
          tag,
          requireInteraction: requireInteraction || false,
          silent: false,
        });

        notificationRef.current = notification;

        // Handle click
        notification.onclick = () => {
          window.focus();
          notification.close();
          onClick?.();
        };

        // Auto-close after 10 seconds if not requiring interaction
        if (!requireInteraction) {
          setTimeout(() => notification.close(), 10000);
        }

        return true;
      } catch (error) {
        console.error("[NOTIFICATIONS] Error showing notification:", error);
        // Fallback to toast
        toast({
          title,
          description: body,
        });
        return false;
      }
    },
    [isSupported, permission]
  );

  /**
   * Show order ready notification
   */
  const showOrderReadyNotification = useCallback(
    (orderNumber: string, tableNumber?: string) => {
      return showNotification({
        title: "Order Ready!",
        body: `Order #${orderNumber.slice(-4)}${tableNumber ? ` for ${tableNumber.toLowerCase().includes("table") ? tableNumber : `Table ${tableNumber}`}` : ""} is ready for pickup.`,
        tag: `order-${orderNumber}`,
        icon: "/icon-192x192.png",
        onClick: () => {
          // Navigate to orders page
          window.location.href = "/orders";
        },
      });
    },
    [showNotification]
  );

  /**
   * Show low stock notification
   */
  const showLowStockNotification = useCallback(
    (itemName: string, currentStock: number, minStock: number) => {
      return showNotification({
        title: "Low Stock Alert",
        body: `${itemName} is running low (${currentStock} remaining, min: ${minStock}).`,
        tag: `low-stock-${itemName}`,
        icon: "/icon-192x192.png",
        requireInteraction: true,
        onClick: () => {
          window.location.href = "/admin/inventory";
        },
      });
    },
    [showNotification]
  );

  /**
   * Show generic system notification
   */
  const showSystemNotification = useCallback(
    (title: string, message: string, options?: Partial<NotificationOptions>) => {
      return showNotification({
        title,
        body: message,
        ...options,
      });
    },
    [showNotification]
  );

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showOrderReadyNotification,
    showLowStockNotification,
    showSystemNotification,
  };
}

/**
 * Hook to automatically request notifications on specific routes
 */
export function useRequestNotificationsOnMount(
  requestOnMount: boolean = true,
  _showToastOnDeny: boolean = false
) {
  const { isSupported, permission, requestPermission } = useNotifications();

  useEffect(() => {
    if (requestOnMount && isSupported && permission === "default") {
      // Delay slightly to not interrupt page load
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [requestOnMount, isSupported, permission, requestPermission]);

  return { isSupported, permission };
}
