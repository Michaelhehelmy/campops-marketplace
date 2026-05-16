/**
 * PWA Settings Page
 * Manage PWA installation, caching, and offline settings
 */

import { usePWA } from "@/hooks/usePWA";
import { useBranding } from "@/contexts/BrandingContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  Download,
  Check,
  RefreshCw,
  Trash2,
  Wifi,
  WifiOff,
  MonitorSmartphone,
  Info,
} from "lucide-react";

export default function PWASettingsPage() {
  const branding = useBranding();
  const {
    isInstallable,
    isInstalled,
    isOffline,
    isStandalone,
    canClearCache,
    pwaInfo,
    install,
    clearCache,
    checkForUpdates,
  } = usePWA();

  const handleClearCache = async () => {
    if (confirm("Are you sure you want to clear the app cache? This will reload the page.")) {
      await clearCache();
    }
  };

  const handleCopyDebugInfo = () => {
    const debugInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isInstallable,
      isInstalled,
      isOffline,
      isStandalone,
      canClearCache,
      pwaInfo,
      serviceWorker: "serviceWorker" in navigator,
    };

    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    toast({
      title: "Debug Info Copied",
      description: "PWA diagnostic information copied to clipboard",
    });
  };

  return (
    <div className="container mx-auto py-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">PWA Settings</h1>
        <p className="text-muted-foreground">
          Manage app installation, caching, and offline capabilities
        </p>
      </div>

      <div className="space-y-6">
        {/* Installation Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              App Installation
            </CardTitle>
            <CardDescription>
              Install {branding.appName} as a standalone app on your device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Installation Status</p>
                <p className="text-sm text-muted-foreground">
                  {isStandalone
                    ? "Running as installed app"
                    : isInstalled
                      ? "Installed (running in browser)"
                      : "Not installed"}
                </p>
              </div>
              <Badge variant={isStandalone || isInstalled ? "default" : "secondary"}>
                {isStandalone || isInstalled ? (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Installed
                  </>
                ) : (
                  "Not Installed"
                )}
              </Badge>
            </div>

            {isInstallable && !isStandalone && (
              <>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Ready to Install</p>
                    <p className="text-sm text-muted-foreground">
                      Install {branding.appName} for quick access from your home screen
                    </p>
                  </div>
                  <Button onClick={install} className="gap-2">
                    <Download className="h-4 w-4" />
                    Install App
                  </Button>
                </div>
              </>
            )}

            {!isInstallable && !isStandalone && !isInstalled && (
              <div className="rounded-lg bg-amber-50 p-4 text-amber-900">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 mt-0.5" />
                  <div>
                    <p className="font-medium">Installation Not Available</p>
                    <p className="text-sm mt-1">
                      Your browser or device may not support PWA installation. Try using Chrome,
                      Edge, or Safari on a compatible device.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOffline ? (
                <WifiOff className="h-5 w-5 text-amber-500" />
              ) : (
                <Wifi className="h-5 w-5 text-green-500" />
              )}
              Connection Status
            </CardTitle>
            <CardDescription>Current network and offline capabilities</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Network Status</p>
                <p className="text-sm text-muted-foreground">
                  {isOffline ? "Offline - Using cached data" : "Online - Connected to server"}
                </p>
              </div>
              <Badge variant={isOffline ? "destructive" : "default"}>
                {isOffline ? "Offline" : "Online"}
              </Badge>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-sm font-medium">Offline Capabilities</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View cached pages and data</li>
                <li>• Queue mutations for sync when online</li>
                <li>• Access previously loaded guest information</li>
                <li>• View orders and reservations (read-only)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Cache Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Cache Management
            </CardTitle>
            <CardDescription>Clear cached data and check for app updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Service Worker Status</p>
                <p className="text-sm text-muted-foreground">
                  {canClearCache ? "Active - Caching enabled" : "Inactive - No cache available"}
                </p>
              </div>
              <Badge variant={canClearCache ? "default" : "secondary"}>
                {canClearCache ? "Active" : "Inactive"}
              </Badge>
            </div>

            {pwaInfo && (
              <div className="rounded-lg bg-muted p-3 text-xs font-mono">
                <p>Scope: {pwaInfo.swScope}</p>
                <p>Script: {pwaInfo.swUrl?.split("/").pop()}</p>
              </div>
            )}

            <Separator />

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={checkForUpdates}
                className="gap-2"
                disabled={!canClearCache}
              >
                <RefreshCw className="h-4 w-4" />
                Check for Updates
              </Button>

              <Button
                variant="outline"
                onClick={handleClearCache}
                className="gap-2"
                disabled={!canClearCache}
              >
                <Trash2 className="h-4 w-4" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
            <CardDescription>Copy diagnostic information for troubleshooting</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" onClick={handleCopyDebugInfo} className="gap-2">
              <Info className="h-4 w-4" />
              Copy Debug Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
