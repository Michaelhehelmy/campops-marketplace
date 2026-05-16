/**
 * Offline Queue Service
 * Manages IndexedDB queue for offline mutations using idb library
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { toast } from "@/hooks/use-toast";

// Queue item types for critical mutations
export type QueueItemType =
  | "createOrder"
  | "updateOrderStatus"
  | "createReservation"
  | "recordPayment";

interface QueueItem {
  id: string;
  type: QueueItemType;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH";
  payload: unknown;
  retryCount: number;
  maxRetries: number;
  createdAt: number;
  error?: string;
}

interface OfflineQueueDB extends DBSchema {
  mutations: {
    key: string;
    value: QueueItem;
    indexes: {
      byCreatedAt: number;
      byType: QueueItemType;
    };
  };
}

const DB_NAME = "app-offline-queue";
const DB_VERSION = 1;
const MAX_RETRIES = 3;

class OfflineQueueService {
  private db: IDBPDatabase<OfflineQueueDB> | null = null;
  private isSyncing = false;
  private syncCallbacks: Set<(status: "syncing" | "done" | "error", count: number) => void> =
    new Set();

  /**
   * Initialize the IndexedDB database
   */
  async init(): Promise<void> {
    if (this.db) return;

    try {
      this.db = await openDB<OfflineQueueDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
          // Create mutations store
          const store = db.createObjectStore("mutations", {
            keyPath: "id",
          });

          // Create indexes
          store.createIndex("byCreatedAt", "createdAt");
          store.createIndex("byType", "type");
        },
      });

      console.log("[OFFLINE] Queue database initialized");
    } catch (error) {
      console.error("[OFFLINE] Failed to initialize database:", error);
      throw error;
    }
  }

  /**
   * Queue a mutation for later execution
   */
  async queueMutation(
    type: QueueItemType,
    endpoint: string,
    method: "POST" | "PUT" | "PATCH",
    payload: unknown
  ): Promise<string> {
    await this.init();

    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: QueueItem = {
      id,
      type,
      endpoint,
      method,
      payload,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: Date.now(),
    };

    try {
      await this.db!.put("mutations", item);
      console.log(`[OFFLINE] Queued mutation: ${type} (${id})`);

      // Show toast notification
      toast({
        title: "Queued for Sync",
        description: `Changes will sync when you're back online`,
      });

      return id;
    } catch (error) {
      console.error("[OFFLINE] Failed to queue mutation:", error);
      throw error;
    }
  }

  /**
   * Get all queued mutations
   */
  async getAllMutations(): Promise<QueueItem[]> {
    await this.init();
    return this.db!.getAllFromIndex("mutations", "byCreatedAt");
  }

  /**
   * Get pending mutations count
   */
  async getPendingCount(): Promise<number> {
    await this.init();
    return this.db!.count("mutations");
  }

  /**
   * Remove a mutation from the queue (successful execution)
   */
  async removeMutation(id: string): Promise<void> {
    await this.init();
    await this.db!.delete("mutations", id);
    console.log(`[OFFLINE] Removed mutation: ${id}`);
  }

  /**
   * Update a mutation (increment retry count, add error)
   */
  async updateMutation(id: string, updates: Partial<QueueItem>): Promise<void> {
    await this.init();
    const item = await this.db!.get("mutations", id);
    if (item) {
      await this.db!.put("mutations", { ...item, ...updates });
    }
  }

  /**
   * Clear all mutations
   */
  async clearAll(): Promise<void> {
    await this.init();
    await this.db!.clear("mutations");
    console.log("[OFFLINE] Cleared all mutations");
  }

  /**
   * Subscribe to sync status changes
   */
  onSync(callback: (status: "syncing" | "done" | "error", count: number) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  private notifySync(status: "syncing" | "done" | "error", count: number): void {
    this.syncCallbacks.forEach((cb) => cb(status, count));
  }

  /**
   * Sync all queued mutations
   * Call this when connection is restored
   */
  async sync(): Promise<{
    success: number;
    failed: number;
    conflicts: QueueItem[];
  }> {
    if (this.isSyncing) {
      console.log("[OFFLINE] Sync already in progress");
      return { success: 0, failed: 0, conflicts: [] };
    }

    await this.init();
    this.isSyncing = true;

    const mutations = await this.getAllMutations();
    if (mutations.length === 0) {
      this.isSyncing = false;
      this.notifySync("done", 0);
      return { success: 0, failed: 0, conflicts: [] };
    }

    console.log(`[OFFLINE] Starting sync of ${mutations.length} mutations`);
    this.notifySync("syncing", mutations.length);

    let success = 0;
    let failed = 0;
    const conflicts: QueueItem[] = [];

    for (const mutation of mutations) {
      try {
        const response = await fetch(mutation.endpoint, {
          method: mutation.method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(mutation.payload),
        });

        if (response.ok) {
          await this.removeMutation(mutation.id);
          success++;
          console.log(`[OFFLINE] Synced: ${mutation.type} (${mutation.id})`);
        } else if (response.status === 409) {
          // Conflict - needs manual resolution
          conflicts.push(mutation);
          await this.updateMutation(mutation.id, {
            error: "Conflict: Data was modified on server",
          });
          failed++;
          console.warn(`[OFFLINE] Conflict for: ${mutation.type} (${mutation.id})`);
        } else {
          // Other error - increment retry
          const newRetryCount = mutation.retryCount + 1;
          if (newRetryCount >= mutation.maxRetries) {
            await this.updateMutation(mutation.id, {
              retryCount: newRetryCount,
              error: `Failed after ${newRetryCount} attempts: ${response.statusText}`,
            });
            conflicts.push(mutation);
            failed++;
          } else {
            await this.updateMutation(mutation.id, {
              retryCount: newRetryCount,
              error: `Attempt ${newRetryCount} failed: ${response.statusText}`,
            });
          }
        }
      } catch (error) {
        // Network error - keep for next sync
        console.error(`[OFFLINE] Network error syncing ${mutation.id}:`, error);
        const newRetryCount = mutation.retryCount + 1;
        if (newRetryCount >= mutation.maxRetries) {
          await this.updateMutation(mutation.id, {
            retryCount: newRetryCount,
            error: `Max retries exceeded`,
          });
          conflicts.push(mutation);
          failed++;
        } else {
          await this.updateMutation(mutation.id, {
            retryCount: newRetryCount,
          });
        }
      }
    }

    this.isSyncing = false;
    this.notifySync(failed > 0 ? "error" : "done", conflicts.length);

    const remaining = await this.getPendingCount();
    if (success > 0) {
      toast({
        title: "Sync Complete",
        description: `${success} changes synced${remaining > 0 ? `, ${remaining} pending` : ""}${conflicts.length > 0 ? `, ${conflicts.length} conflicts` : ""}`,
        variant: conflicts.length > 0 ? "destructive" : "default",
      });
    }

    return { success, failed, conflicts };
  }
}

// Export singleton instance
export const offlineQueue = new OfflineQueueService();

// Helper function to check if we're online
export function isOnline(): boolean {
  return typeof navigator !== "undefined" ? navigator.onLine : true;
}

// Helper to wrap mutations with offline support
export async function queueIfOffline<T>(
  type: QueueItemType,
  endpoint: string,
  method: "POST" | "PUT" | "PATCH",
  payload: unknown,
  executeFn: () => Promise<T>
): Promise<T | { queued: true; id: string }> {
  if (isOnline()) {
    // Online - execute immediately
    return executeFn();
  } else {
    // Offline - queue for later
    const id = await offlineQueue.queueMutation(type, endpoint, method, payload);
    return { queued: true, id };
  }
}
