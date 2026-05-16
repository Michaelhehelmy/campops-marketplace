/**
 * PWA Install Button Component
 * Shows install button when app is installable
 */

import { usePWA } from "@/hooks/usePWA";
import { Button } from "@/components/ui/Button";
import { Download, Check, MonitorSmartphone } from "lucide-react";

export function PWAInstallButton({
  variant = "default",
  size = "default",
  showWhenInstalled = false,
}: {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showWhenInstalled?: boolean;
}) {
  const { isInstallable, isInstalled, isStandalone, install } = usePWA();

  // Don't show if not installable and not showing when installed
  if (!isInstallable && !showWhenInstalled) {
    return null;
  }

  // If installed/standalone, show success state if requested
  if ((isInstalled || isStandalone) && showWhenInstalled) {
    return (
      <Button variant="outline" size={size} disabled className="gap-2">
        <Check className="h-4 w-4" />
        <span className="hidden sm:inline">Installed</span>
      </Button>
    );
  }

  // Show install button
  return (
    <Button variant={variant} size={size} onClick={install} className="gap-2">
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  );
}

/**
 * PWA Status Badge - Shows current PWA status
 */
export function PWAStatusBadge() {
  const { isStandalone, isInstallable, isOffline } = usePWA();

  if (isOffline) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-600">
        <MonitorSmartphone className="h-3 w-3" />
        Offline
      </div>
    );
  }

  if (isStandalone) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600">
        <Check className="h-3 w-3" />
        App Mode
      </div>
    );
  }

  if (isInstallable) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Download className="h-3 w-3" />
        Installable
      </div>
    );
  }

  return null;
}
