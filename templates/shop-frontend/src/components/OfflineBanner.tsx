/**
 * Offline Banner Component
 * Persistent banner showing offline status and pending sync count
 */

import { useEffect, useState } from "react";
import { useOfflineBanner } from "@/hooks/usePWA";
import { offlineQueue } from "@/lib/offlineQueue";
import { Button } from "@/components/ui/Button";
import { WifiOff, RefreshCw, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const { isOffline, showBanner, dismissBanner } = useOfflineBanner();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update pending count when banner shows
  useEffect(() => {
    if (showBanner) {
      offlineQueue.getPendingCount().then(setPendingCount);
    }
  }, [showBanner]);

  // Subscribe to sync status
  useEffect(() => {
    return offlineQueue.onSync((status, _count) => {
      setIsSyncing(status === "syncing");
      if (status === "done" || status === "error") {
        offlineQueue.getPendingCount().then(setPendingCount);
      }
    });
  }, []);

  // Handle manual sync when coming back online
  const handleSync = async () => {
    setIsSyncing(true);
    await offlineQueue.sync();
    setIsSyncing(false);
  };

  if (!showBanner && !isOffline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isOffline
          ? "bg-amber-500 text-amber-950"
          : pendingCount > 0
            ? "bg-blue-500 text-white"
            : "bg-green-500 text-white translate-y-[-100%]"
      )}
    >
      <div className="container mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isOffline ? (
            <>
              <WifiOff className="h-4 w-4" />
              <span>You are offline. Changes will sync when connection resumes.</span>
              {pendingCount > 0 && (
                <span className="ml-2 bg-amber-700 text-amber-100 px-2 py-0.5 rounded-full text-xs">
                  {pendingCount} pending
                </span>
              )}
            </>
          ) : pendingCount > 0 ? (
            <>
              <AlertCircle className="h-4 w-4" />
              <span>{pendingCount} changes waiting to sync</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              <span>Back online! All changes synced.</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && !isOffline && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
              className="h-7 text-xs gap-1"
            >
              <RefreshCw className={cn("h-3 w-3", isSyncing && "animate-spin")} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          )}

          {!isOffline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissBanner}
              className="h-7 w-7 p-0"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Conflict Resolution Dialog
 * Shows when mutations fail with conflicts
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

export function ConflictResolutionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [conflicts, setConflicts] = useState<Array<{ id: string; type: string; error?: string }>>(
    []
  );

  useEffect(() => {
    if (open) {
      offlineQueue.getAllMutations().then((mutations) => {
        const failed = mutations.filter((m) => m.error);
        setConflicts(failed as typeof conflicts);
      });
    }
  }, [open]);

  const handleRetry = async (id: string) => {
    const mutations = await offlineQueue.getAllMutations();
    const mutation = mutations.find((m) => m.id === id);
    if (!mutation) return;

    // Remove error and reset retry count
    await offlineQueue.updateMutation(id, { error: undefined, retryCount: 0 });

    // Trigger sync
    const result = await offlineQueue.sync();

    if (result.success > 0) {
      toast({ title: "Changes synced successfully" });
    } else {
      toast({ title: "Sync failed", variant: "destructive" });
    }

    // Refresh conflicts list
    const remaining = await offlineQueue.getAllMutations();
    setConflicts(remaining.filter((m) => m.error) as typeof conflicts);
  };

  const handleDiscard = async (id: string) => {
    await offlineQueue.removeMutation(id);
    setConflicts((prev) => prev.filter((c) => c.id !== id));
    toast({ title: "Change discarded" });
  };

  const handleDiscardAll = async () => {
    await Promise.all(conflicts.map((c) => offlineQueue.removeMutation(c.id)));
    setConflicts([]);
    toast({ title: "All changes discarded" });
    onClose();
  };

  if (conflicts.length === 0 && open) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No Conflicts</DialogTitle>
            <DialogDescription>All queued changes have been synced successfully.</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Sync Conflicts
          </DialogTitle>
          <DialogDescription>
            Some changes could not be synced. Review and retry or discard them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] mt-4">
          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <div key={conflict.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{conflict.type}</span>
                  <span className="text-xs text-destructive">{conflict.error}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRetry(conflict.id)}
                    className="flex-1"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDiscard(conflict.id)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    Discard
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {conflicts.length > 1 && (
          <Button variant="destructive" className="w-full mt-4" onClick={handleDiscardAll}>
            Discard All Changes
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
