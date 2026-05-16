/**
 * Local Page Store
 * Manages IndexedDB storage for page drafts and offline editing
 */

import { openDB, DBSchema, IDBPDatabase } from "idb";
import { PageBlock, PageSEO } from "@/types/api";

interface PageDraft {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  blocks: PageBlock[];
  seo: PageSEO;
  updatedAt: number;
  syncStatus: "synced" | "pending" | "conflict";
}

interface PageDraftDB extends DBSchema {
  drafts: {
    key: string;
    value: PageDraft;
    indexes: {
      byUpdatedAt: number;
      bySyncStatus: string;
    };
  };
}

const DB_NAME = "campops-page-drafts";
const DB_VERSION = 1;

class LocalPageStore {
  private db: IDBPDatabase<PageDraftDB> | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<PageDraftDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("drafts", { keyPath: "id" });
        store.createIndex("byUpdatedAt", "updatedAt");
        store.createIndex("bySyncStatus", "syncStatus");
      },
    });
  }

  async saveDraft(
    pageId: string,
    data: {
      title: string;
      slug: string;
      status: "draft" | "published";
      blocks: PageBlock[];
      seo: PageSEO;
    }
  ): Promise<void> {
    await this.init();

    const draft: PageDraft = {
      id: pageId,
      ...data,
      updatedAt: Date.now(),
      syncStatus: "pending",
    };

    await this.db!.put("drafts", draft);
  }

  async getDraft(pageId: string): Promise<PageDraft | null> {
    await this.init();
    return (await this.db!.get("drafts", pageId)) || null;
  }

  async getAllDrafts(): Promise<PageDraft[]> {
    await this.init();
    return this.db!.getAllFromIndex("drafts", "byUpdatedAt");
  }

  async getPendingDrafts(): Promise<PageDraft[]> {
    await this.init();
    return this.db!.getAllFromIndex("drafts", "bySyncStatus", "pending");
  }

  async markAsSynced(pageId: string): Promise<void> {
    await this.init();
    const draft = await this.db!.get("drafts", pageId);
    if (draft) {
      draft.syncStatus = "synced";
      await this.db!.put("drafts", draft);
    }
  }

  async markAsConflict(pageId: string): Promise<void> {
    await this.init();
    const draft = await this.db!.get("drafts", pageId);
    if (draft) {
      draft.syncStatus = "conflict";
      await this.db!.put("drafts", draft);
    }
  }

  async deleteDraft(pageId: string): Promise<void> {
    await this.init();
    await this.db!.delete("drafts", pageId);
  }

  async clearAllDrafts(): Promise<void> {
    await this.init();
    await this.db!.clear("drafts");
  }
}

export const localPageStore = new LocalPageStore();
export type { PageDraft };
