/**
 * Unified PWA Prompt Modal
 * – Handles both "Install" and "Update" prompts in a single adaptive UI.
 * – Prioritizes updates if both are pending.
 * – Only shows "Install" if not already running as a standalone PWA.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Download, RefreshCw, Smartphone, X, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useBranding } from "@/contexts/BrandingContext";

// ─── Types ────────────────────────────────────────────────────────────────────

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
  interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
    prompt(): Promise<void>;
  }
}

type PromptType = "install" | "update" | null;

export function PWAPrompt() {
  const branding = useBranding();
  const [type, setType] = useState<PromptType>(null);
  const [loading, setLoading] = useState(false);

  // Refs to store events/registrations
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const isStandalone = useCallback(() => {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
  }, []);

  const isTestMode = useCallback(() => {
    return (
      (import.meta.env.MODE === "test" ||
        window.location.search.includes("test=true") ||
        !!navigator.webdriver) &&
      !window.location.search.includes("pwa-test=true")
    );
  }, []);

  // ─── Update Detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator) || isTestMode()) return;

    const showUpdatePrompt = (reg: ServiceWorkerRegistration) => {
      registrationRef.current = reg;
      // Only surface the update modal when running as an installed PWA.
      // In a regular browser tab we skip the prompt and let the SW update silently.
      if (isStandalone()) {
        setType("update");
      } else {
        // Silent update: tell the waiting SW to skip waiting immediately.
        reg.waiting?.postMessage({ type: "SKIP_WAITING" });
      }
    };

    const checkForWaiting = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) showUpdatePrompt(reg);
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;
      checkForWaiting(reg);

      reg.addEventListener("updatefound", () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener("statechange", () => {
          if (installing.state === "installed" && navigator.serviceWorker.controller) {
            showUpdatePrompt(reg);
          }
        });
      });
    });

    // Reload when the new service worker takes control (after SKIP_WAITING).
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, [isStandalone, isTestMode]);

  // ─── Install Detection ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isStandalone() || isTestMode()) return;

    // Don't show if user dismissed within the last 7 days
    const snoozed = localStorage.getItem("pwa_install_snoozed");
    if (snoozed && Date.now() - Number(snoozed) < 7 * 24 * 60 * 60 * 1000) return;

    const handlePrompt = (e: BeforeInstallPromptEvent) => {
      console.log("PWA: beforeinstallprompt event fired!");
      e.preventDefault();
      deferredPromptRef.current = e;

      // Small delay so the page can settle before showing the modal
      setTimeout(() => {
        // Only set to install if we aren't already showing an update prompt
        setType((prev) => (prev === "update" ? "update" : "install"));
      }, 3000);
    };

    const handleInstalled = () => {
      setType(null);
      deferredPromptRef.current = null;
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [isStandalone, isTestMode]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAction = useCallback(async () => {
    if (type === "update") {
      const reg = registrationRef.current;
      if (!reg?.waiting) return;
      setLoading(true);
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    } else if (type === "install") {
      const prompt = deferredPromptRef.current;
      if (!prompt) return;
      setLoading(true);
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      setLoading(false);
      if (outcome === "accepted") {
        setType(null);
        deferredPromptRef.current = null;
      }
    }
  }, [type]);

  const handleDismiss = useCallback(() => {
    if (type === "install") {
      localStorage.setItem("pwa_install_snoozed", String(Date.now()));
    }
    setType(null);
  }, [type]);

  if (!type) return null;

  const isUpdate = type === "update";

  return (
    <div
      data-testid={isUpdate ? "pwa-update-banner" : "install-pwa-banner"}
      className={`fixed ${isUpdate ? "top-4" : "bottom-4"} left-1/2 -translate-x-1/2 z-[100] w-[calc(100vw-2rem)] max-w-sm animate-in ${isUpdate ? "slide-in-from-top-4" : "slide-in-from-bottom-4"} duration-300`}
    >
      <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-stone-200 overflow-hidden">
        {/* Accent strip */}
        <div
          className={`h-1 bg-gradient-to-r ${isUpdate ? "from-sky-500 via-blue-500 to-indigo-500" : "from-amber-600 via-yellow-500 to-amber-400"}`}
        />

        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl ${isUpdate ? "bg-sky-50" : "bg-amber-50"} flex items-center justify-center shrink-0`}
              >
                {isUpdate ? (
                  <RefreshCw className="h-5 w-5 text-sky-600" />
                ) : (
                  <Smartphone className="h-5 w-5 text-amber-700" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-stone-900 leading-tight">
                  {isUpdate ? "Update available" : `Install ${branding.appName}`}
                </p>
                <p className="text-xs text-stone-500 mt-0.5">
                  {isUpdate
                    ? `A new version of ${branding.appName} is ready`
                    : "Add to home screen for the best experience"}
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1 -mr-1 -mt-1"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!isUpdate && (
            <div className="flex gap-2 flex-wrap mb-4">
              {["Works offline", "Fast & smooth", "No app store"].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200"
                >
                  <Zap className="h-2.5 w-2.5" />
                  {f}
                </span>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="flex-1 text-stone-500 hover:text-stone-700 h-9"
            >
              {isUpdate ? "Later" : "Not now"}
            </Button>
            <Button
              data-testid={isUpdate ? "pwa-update-button" : "install-pwa-button"}
              size="sm"
              onClick={handleAction}
              disabled={loading}
              className={`flex-1 ${isUpdate ? "bg-sky-600 hover:bg-sky-700" : "bg-amber-600 hover:bg-amber-700"} text-white gap-2 h-9`}
            >
              {isUpdate ? (
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              {loading
                ? isUpdate
                  ? "Reloading…"
                  : "Installing…"
                : isUpdate
                  ? "Update now"
                  : "Install"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
