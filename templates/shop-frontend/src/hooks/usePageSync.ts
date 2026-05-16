/**
 * Page Sync Hook
 * Manages offline page editing with local persistence and sync
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { localPageStore } from "@/lib/localPageStore";
import { pageSyncQueue, PageOperationType } from "@/lib/pageSyncQueue";
import { useCanvasStore } from "@/store/canvasStore";
import { toast } from "@/hooks/use-toast";

interface UsePageSyncOptions {
  pageId: string;
  onSave: (data: {
    title: string;
    slug: string;
    status: "draft" | "published";
    content: unknown[];
    seo: Record<string, string>;
  }) => Promise<void>;
  onPublish?: (pageId: string) => Promise<void>;
}

export function usePageSync({ pageId, onSave }: UsePageSyncOptions) {
  const store = useCanvasStore();
  const [isLoading, setIsLoading] = useState(false);
  const [hasConflict, setHasConflict] = useState(false);
  const [isLoadedFromLocal, setIsLoadedFromLocal] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load from local storage if offline, or sync pending changes
  useEffect(() => {
    const loadLocalData = async () => {
      if (!navigator.onLine) {
        const draft = await localPageStore.getDraft(pageId);
        if (draft) {
          store.setPageData({
            title: draft.title,
            slug: draft.slug,
            status: draft.status,
            content: draft.blocks,
            seo: draft.seo,
          });
          setIsLoadedFromLocal(true);
          toast({
            title: "Loaded from Local Storage",
            description: "Working with locally saved version",
          });
        }
      }
    };

    loadLocalData();
  }, [pageId]);

  // Auto-save to IndexedDB with debounce
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((state) => {
      if (!state.isDirty) return;

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        await localPageStore.saveDraft(pageId, {
          title: state.title,
          slug: state.slug,
          status: state.status,
          blocks: state.blocks,
          seo: state.seo,
        });
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [pageId]);

  // Sync when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      const pending = await pageSyncQueue.getPendingOperations();
      if (pending.length > 0) {
        toast({
          title: "Syncing Changes...",
          description: `${pending.length} operations pending`,
        });

        const result = await pageSyncQueue.processQueue(async (type, pid, data) => {
          if (type === "save") {
            await onSave(data);
            await localPageStore.markAsSynced(pid);
          }
        });

        if (result.conflicts.length > 0) {
          setHasConflict(true);
          toast({
            title: "Sync Conflicts",
            description: `${result.conflicts.length} conflicts need resolution`,
            variant: "destructive",
          });
        } else if (result.success > 0) {
          toast({
            title: "Sync Complete",
            description: `${result.success} changes synced`,
          });
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [onSave]);

  const saveWithSync = useCallback(
    async (saveFn: () => Promise<void>) => {
      if (!navigator.onLine) {
        // Queue for later
        await pageSyncQueue.queueOperation("save", pageId, {
          title: store.title,
          slug: store.slug,
          status: store.status,
          content: store.blocks,
          seo: store.seo,
        });
        return;
      }

      try {
        await saveFn();
        await localPageStore.markAsSynced(pageId);
      } catch (error: any) {
        if (error?.response?.status === 409) {
          setHasConflict(true);
          await localPageStore.markAsConflict(pageId);
          throw error;
        }
        throw error;
      }
    },
    [pageId, store]
  );

  const resolveConflict = useCallback(
    async (action: "reload" | "keep") => {
      if (action === "reload") {
        // Clear local draft and reload from server
        await localPageStore.deleteDraft(pageId);
        window.location.reload();
      } else {
        // Keep local version and re-queue
        setHasConflict(false);
        await localPageStore.saveDraft(pageId, {
          title: store.title,
          slug: store.slug,
          status: store.status,
          blocks: store.blocks,
          seo: store.seo,
        });
        await pageSyncQueue.queueOperation("save", pageId, {
          title: store.title,
          slug: store.slug,
          status: store.status,
          content: store.blocks,
          seo: store.seo,
        });
        toast({
          title: "Changes Re-queued",
          description: "Your version will be synced",
        });
      }
    },
    [pageId, store]
  );

  return {
    isLoading,
    isLocalOnly: (!navigator.onLine && store.isDirty) || isLoadedFromLocal,
    hasConflict,
    setHasConflict,
    saveWithSync,
    resolveConflict,
  };
}
