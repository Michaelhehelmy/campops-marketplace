/**
 * Page Sync Queue
 * Manages offline operations for page save/publish actions
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { toast } from "@/hooks/use-toast";

export type PageOperationType = "save" | "publish";

interface PageOperation {
  id: string;
  type: PageOperationType;
  pageId: string;
  data: {
    title: string;
    slug: string;
    status: "draft" | "published";
    content: unknown[];
    seo: Record<string, string>;
  };
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

interface PageSyncDB extends DBSchema {
  operations: {
    key: string;
    value: PageOperation;
    indexes: {
      byTimestamp: number;
      byPageId: string;
    };
  };
}

const DB_NAME = "sinaicamps-page-sync";
const DB_VERSION = 1;
const MAX_RETRIES = 3;

class PageSyncQueue {
  private db: IDBPDatabase<PageSyncDB> | null = null;
  private isProcessing = false;
  private syncCallbacks: Set<(status: "syncing" | "done" | "error", count: number) => void> =
    new Set();

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PageSyncDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("operations", { keyPath: "id" });
        store.createIndex("byTimestamp", "timestamp");
        store.createIndex("byPageId", "pageId");
      },
    });
  }

  async queueOperation(
    type: PageOperationType,
    pageId: string,
    data: PageOperation["data"]
  ): Promise<string> {
    await this.init();

    const id = `${type}-${pageId}-${Date.now()}`;
    const operation: PageOperation = {
      id,
      type,
      pageId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: MAX_RETRIES,
    };

    await this.db!.put("operations", operation);

    toast({
      title: type === "publish" ? "Publish Queued" : "Changes Saved Locally",
      description: "Will sync when you're back online",
    });

    return id;
  }

  async getPendingOperations(): Promise<PageOperation[]> {
    await this.init();
    return this.db!.getAllFromIndex("operations", "byTimestamp");
  }

  async getOperationsForPage(pageId: string): Promise<PageOperation[]> {
    await this.init();
    return this.db!.getAllFromIndex("operations", "byPageId", pageId);
  }

  async removeOperation(id: string): Promise<void> {
    await this.init();
    await this.db!.delete("operations", id);
  }

  async updateOperation(id: string, updates: Partial<PageOperation>): Promise<void> {
    await this.init();
    const op = await this.db!.get("operations", id);
    if (op) {
      await this.db!.put("operations", { ...op, ...updates });
    }
  }

  async clearAll(): Promise<void> {
    await this.init();
    await this.db!.clear("operations");
  }

  onSync(callback: (status: "syncing" | "done" | "error", count: number) => void): () => void {
    this.syncCallbacks.add(callback);
    return () => this.syncCallbacks.delete(callback);
  }

  private notifySync(status: "syncing" | "done" | "error", count: number): void {
    this.syncCallbacks.forEach((cb) => cb(status, count));
  }

  async processQueue(
    executeFn: (
      type: PageOperationType,
      pageId: string,
      data: PageOperation["data"]
    ) => Promise<void>
  ): Promise<{ success: number; failed: number; conflicts: PageOperation[] }> {
    if (this.isProcessing) {
      return { success: 0, failed: 0, conflicts: [] };
    }

    await this.init();
    this.isProcessing = true;

    const operations = await this.getPendingOperations();
    if (operations.length === 0) {
      this.isProcessing = false;
      return { success: 0, failed: 0, conflicts: [] };
    }

    this.notifySync("syncing", operations.length);

    let success = 0;
    let failed = 0;
    const conflicts: PageOperation[] = [];

    for (const op of operations) {
      try {
        await executeFn(op.type, op.pageId, op.data);
        await this.removeOperation(op.id);
        success++;
      } catch (error: any) {
        if (error?.response?.status === 409) {
          conflicts.push(op);
          await this.updateOperation(op.id, {
            error: "Conflict: Page was modified on server",
          });
          failed++;
        } else {
          const newRetryCount = op.retryCount + 1;
          if (newRetryCount >= op.maxRetries) {
            conflicts.push(op);
            await this.updateOperation(op.id, {
              retryCount: newRetryCount,
              error: error?.message || "Max retries exceeded",
            });
            failed++;
          } else {
            await this.updateOperation(op.id, {
              retryCount: newRetryCount,
              error: error?.message || `Attempt ${newRetryCount} failed`,
            });
          }
        }
      }
    }

    this.isProcessing = false;
    this.notifySync(failed > 0 ? "error" : "done", conflicts.length);

    return { success, failed, conflicts };
  }
}

export const pageSyncQueue = new PageSyncQueue();
export type { PageOperation };
