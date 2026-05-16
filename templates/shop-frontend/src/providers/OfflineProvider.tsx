/**
 * Offline Provider
 * Manages offline detection, sync scheduling, and conflict resolution
 */

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { offlineQueue } from "@/lib/offlineQueue";
import { OfflineBanner, ConflictResolutionDialog } from "@/components/OfflineBanner";

interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  hasConflicts: boolean;
  showConflicts: () => void;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | null>(null);

export function useOffline() {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error("useOffline must be used within an OfflineProvider");
  }
  return context;
}

interface OfflineProviderProps {
  children: ReactNode;
  enableBanner?: boolean;
}

export function OfflineProvider({ children, enableBanner = true }: OfflineProviderProps) {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [hasConflicts, setHasConflicts] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);

  // Initialize offline queue on mount
  useEffect(() => {
    offlineQueue.init().then(() => {
      updatePendingCount();
    });
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Subscribe to sync status
  useEffect(() => {
    return offlineQueue.onSync((status, count) => {
      setIsSyncing(status === "syncing");
      if (status === "done" || status === "error") {
        updatePendingCount();
        if (status === "error" && count > 0) {
          setHasConflicts(true);
        }
      }
    });
  }, []);

  const updatePendingCount = useCallback(async () => {
    const count = await offlineQueue.getPendingCount();
    setPendingCount(count);

    // Check for conflicts (failed mutations)
    const mutations = await offlineQueue.getAllMutations();
    const conflicts = mutations.some((m) => m.error);
    setHasConflicts(conflicts);
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    const result = await offlineQueue.sync();
    setIsSyncing(false);

    await updatePendingCount();

    if (result.conflicts.length > 0) {
      setHasConflicts(true);
      setShowConflictDialog(true);
    }
  }, [isOnline, isSyncing, updatePendingCount]);

  const showConflicts = useCallback(() => {
    setShowConflictDialog(true);
  }, []);

  const contextValue: OfflineContextType = {
    isOnline,
    isSyncing,
    pendingCount,
    hasConflicts,
    showConflicts,
    syncNow,
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {enableBanner && <OfflineBanner />}
      {children}
      <ConflictResolutionDialog
        open={showConflictDialog}
        onClose={() => {
          setShowConflictDialog(false);
          updatePendingCount();
        }}
      />
    </OfflineContext.Provider>
  );
}
