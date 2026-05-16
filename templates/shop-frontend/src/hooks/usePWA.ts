import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "@/hooks/use-toast";
import { useBranding } from "@/contexts/BrandingContext";

// Extend Window interface for the beforeinstallprompt event
declare global {
  interface Window {
    deferredPrompt: any;
  }
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface PWAStatus {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  isStandalone: boolean;
  canClearCache: boolean;
  pwaInfo: {
    version: string;
    lastUpdated: string;
    registration: ServiceWorkerRegistration | null;
  } | null;
}

/**
 * Hook to manage PWA features like installation and offline status
 */
export function usePWA() {
  const { appName } = useBranding();
  const [status, setStatus] = useState<PWAStatus>({
    isInstallable: false,
    isInstalled: false,
    isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
    isStandalone: false,
    canClearCache: typeof navigator !== "undefined" && "serviceWorker" in navigator,
    pwaInfo: null,
  });

  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  // Check if running as standalone (installed PWA)
  const checkStandalone = useCallback(() => {
    if (typeof window === "undefined") return false;

    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone ||
      document.referrer.includes("android-app://")
    );
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default browser prompt
      e.preventDefault();
      // Store the event for later use
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      // Update state
      setStatus((prev) => ({ ...prev, isInstallable: true }));
    };

    const handleAppInstalled = () => {
      // Clear the deferred prompt
      deferredPromptRef.current = null;
      // Update state
      setStatus((prev) => ({
        ...prev,
        isInstallable: false,
        isInstalled: true,
      }));

      toast({
        title: "App Installed",
        description: `${appName} has been successfully installed on your device.`,
      });
    };

    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOffline: false }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOffline: true }));
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check for standalone
    setStatus((prev) => ({
      ...prev,
      isStandalone: checkStandalone(),
      isOffline: !navigator.onLine,
    }));

    // Check if service worker is registered
    if ("serviceWorker" in navigator && navigator.serviceWorker) {
      navigator.serviceWorker
        .getRegistration()
        .then((registration) => {
          setStatus((prev) => ({
            ...prev,
            canClearCache: !!registration,
            pwaInfo: registration
              ? {
                  version: "1.0.0", // This would ideally come from the SW
                  lastUpdated: new Date().toISOString(),
                  registration,
                }
              : null,
          }));
        })
        .catch(() => {
          // Ignore registration errors on mount
        });
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [appName, checkStandalone]);

  /**
   * Trigger the PWA installation prompt
   */
  const install = useCallback(async () => {
    if (!deferredPromptRef.current) {
      toast({
        title: "Cannot Install",
        description: "The app is not installable at this time. Try using Chrome or Edge.",
        variant: "destructive",
      });
      return false;
    }

    // Show the prompt
    await deferredPromptRef.current.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPromptRef.current.userChoice;

    if (outcome === "accepted") {
      setStatus((prev) => ({ ...prev, isInstallable: false }));
      deferredPromptRef.current = null;
      return true;
    }

    return false;
  }, []);

  /**
   * Clear all application caches
   */
  const clearCache = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) {
      toast({
        title: "Service Worker Not Available",
        description: "Your browser does not support this feature.",
        variant: "destructive",
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // Check if there's a message channel to communicate with SW
      if (registration.active) {
        // Create a message channel
        const messageChannel = new MessageChannel();

        // Wait for confirmation
        const responsePromise = new Promise((resolve) => {
          const timeout = setTimeout(() => resolve({ success: false, error: "Timeout" }), 5000);
          messageChannel.port1.onmessage = (event: MessageEvent) => {
            clearTimeout(timeout);
            resolve(event.data);
          };
        });

        // Send clear cache message
        registration.active.postMessage(
          {
            type: "CLEAR_CACHES",
          },
          [messageChannel.port2]
        );

        const response = await responsePromise;

        if ((response as any).success) {
          toast({
            title: "Cache Cleared",
            description: "Application cache has been cleared successfully",
          });
        } else {
          // Fallback: try to unregister and re-register
          await registration.unregister();
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("[PWA] Error clearing cache:", error);
      toast({
        title: "Error Clearing Cache",
        description: "Please reload the page to clear the cache",
        variant: "destructive",
      });
    }
  }, []);

  /**
   * Check for service worker updates
   */
  const checkForUpdates = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !navigator.serviceWorker) {
      toast({
        title: "Service Worker Not Available",
        description: "Your browser does not support this feature.",
        variant: "destructive",
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        toast({
          title: "Checking for Updates",
          description: "The application is checking for available updates.",
        });
      }
    } catch (error) {
      console.error("[PWA] Error checking for updates:", error);
    }
  }, []);

  return {
    ...status,
    install,
    clearCache,
    checkForUpdates,
    dismissBanner: () => setStatus((prev) => ({ ...prev, showBanner: false })), // Added for compatibility
  };
}

/**
 * Specialized hook for the offline banner
 */
export function useOfflineBanner() {
  const pwa = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [lastOfflineStatus, setLastOfflineStatus] = useState(false);

  useEffect(() => {
    // If we just went offline, show the banner
    if (pwa.isOffline && !lastOfflineStatus) {
      setShowBanner(true);
    }

    // If we just came back online, hide the banner after a delay
    if (!pwa.isOffline && lastOfflineStatus) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }

    setLastOfflineStatus(pwa.isOffline);
  }, [pwa.isOffline, lastOfflineStatus]);

  return {
    isOffline: pwa.isOffline,
    showBanner,
    dismissBanner: () => setShowBanner(false),
  };
}
