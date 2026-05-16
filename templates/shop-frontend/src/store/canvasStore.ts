import { create } from "zustand";
import { temporal } from "zundo";
import { PageBlock, CustomPage, PageSEO } from "@/types/api";

interface CanvasState {
  // Page Metadata
  title: string;
  slug: string;
  status: "draft" | "published";
  seo: PageSEO;

  // Content
  blocks: PageBlock[];

  // UI State (not tracked in history)
  selectedBlockId: string | null;
  isDirty: boolean;
  previewDevice: "desktop" | "tablet" | "mobile";
  zoom: number;
  pan: { x: number; y: number };
  blockHeights: Record<string, number>;

  // Actions
  setPageData: (page: Partial<CustomPage>) => void;
  setTitle: (title: string) => void;
  setSlug: (slug: string) => void;
  setStatus: (status: "draft" | "published") => void;
  setBlocks: (blocks: PageBlock[]) => void;
  updateBlock: (blockId: string, updates: Partial<PageBlock>) => void;
  updateBlockDebounced: (blockId: string, updates: Partial<PageBlock>) => void;
  updateNestedBlock: (
    parentBlockId: string,
    columnId: string,
    blockId: string,
    updates: Partial<PageBlock>
  ) => void;
  addBlock: (block: PageBlock, index?: number) => void;
  addNestedBlock: (
    parentBlockId: string,
    columnId: string,
    block: PageBlock,
    index?: number
  ) => void;
  deleteBlock: (blockId: string) => void;
  deleteNestedBlock: (parentBlockId: string, columnId: string, blockId: string) => void;
  moveBlock: (fromIndex: number, toIndex: number) => void;
  addFormField: (blockId: string, field: PageBlock, index?: number) => void;
  updateFormField: (blockId: string, fieldId: string, updates: Partial<PageBlock>) => void;
  deleteFormField: (blockId: string, fieldId: string) => void;
  moveFormField: (blockId: string, fromIndex: number, toIndex: number) => void;
  setSelectedBlockId: (id: string | null) => void;

  setSEO: (seo: Partial<PageSEO>) => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setPreviewDevice: (device: "desktop" | "tablet" | "mobile") => void;
  setBlockHeight: (id: string, height: number) => void;
  reset: () => void;
}

const initialState: Partial<CanvasState> = {
  title: "",
  slug: "",
  status: "draft",
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    ogImage: "",
  },
  blocks: [],
  selectedBlockId: null,
  isDirty: false,
  previewDevice: "desktop",
  zoom: 1,
  pan: { x: 0, y: 0 },
  blockHeights: {},
};

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastRecordedPartial = JSON.stringify({
  title: "",
  slug: "",
  status: "draft",
  blocks: [],
  seo: {
    metaTitle: "",
    metaDescription: "",
    keywords: [],
    ogImage: "",
  },
});

export const useCanvasStore = create<CanvasState>()(
  temporal(
    (set) => ({
      ...(initialState as CanvasState),

      setPageData: (page) =>
        set((state) => ({
          ...state,
          ...page,
          blocks: page.content || state.blocks,
          seo: { ...state.seo, ...page.seo },
          isDirty: false,
        })),

      setTitle: (title) => set({ title, isDirty: true }),
      setSlug: (slug) => set({ slug, isDirty: true }),
      setStatus: (status) => set({ status, isDirty: true }),
      setBlocks: (blocks) => set({ blocks, isDirty: true }),

      updateBlock: (blockId, updates) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) =>
            b.id === blockId
              ? {
                  ...b,
                  ...updates,
                  content: { ...b.content, ...((updates.content as any) || {}) },
                  settings: { ...b.settings, ...(updates.settings || {}) },
                  styles: { ...b.styles, ...(updates.styles || {}) },
                }
              : b
          ),
          isDirty: true,
        })),

      updateBlockDebounced: (blockId, updates) => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(
          () => useCanvasStore.getState().updateBlock(blockId, updates),
          300
        );
      },

      updateNestedBlock: (parentBlockId, columnId, blockId, updates) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== parentBlockId) return b;
            const newColumns = (b.content.columns as any[]).map((col) => {
              if (col.id !== columnId) return col;
              return {
                ...col,
                blocks: col.blocks.map((nb: any) =>
                  nb.id === blockId ? { ...nb, ...updates } : nb
                ),
              };
            });
            return { ...b, content: { ...b.content, columns: newColumns } };
          }),
          isDirty: true,
        })),

      addBlock: (block, index) =>
        set((state) => {
          const newBlocks = [...state.blocks];
          if (typeof index === "number") newBlocks.splice(index, 0, block);
          else newBlocks.push(block);
          return { ...state, blocks: newBlocks, isDirty: true, selectedBlockId: block.id };
        }),

      addNestedBlock: (parentBlockId, columnId, block, index) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== parentBlockId) return b;
            const newColumns = (b.content.columns as any[]).map((col) => {
              if (col.id !== columnId) return col;
              const newBlocks = [...col.blocks];
              if (typeof index === "number") newBlocks.splice(index, 0, block);
              else newBlocks.push(block);
              return { ...col, blocks: newBlocks };
            });
            return { ...b, content: { ...b.content, columns: newColumns } };
          }),
          isDirty: true,
          selectedBlockId: block.id,
        })),

      deleteBlock: (blockId) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.filter((b) => b.id !== blockId),
          isDirty: true,
          selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        })),

      deleteNestedBlock: (parentBlockId, columnId, blockId) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== parentBlockId) return b;
            const newColumns = (b.content.columns as any[]).map((col) => {
              if (col.id !== columnId) return col;
              return { ...col, blocks: col.blocks.filter((nb: any) => nb.id !== blockId) };
            });
            return { ...b, content: { ...b.content, columns: newColumns } };
          }),
          isDirty: true,
          selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        })),

      moveBlock: (fromIndex, toIndex) =>
        set((state) => {
          const newBlocks = [...state.blocks];
          const [movedBlock] = newBlocks.splice(fromIndex, 1);
          newBlocks.splice(toIndex, 0, movedBlock);
          return { ...state, blocks: newBlocks, isDirty: true };
        }),

      addFormField: (blockId, field, index) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const fields = [...((b.content.fields as any[]) || [])];
            if (typeof index === "number") fields.splice(index, 0, field);
            else fields.push(field);
            return { ...b, content: { ...b.content, fields } };
          }),
          isDirty: true,
          selectedBlockId: field.id,
        })),

      updateFormField: (blockId, fieldId, updates) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const fields = ((b.content.fields as any[]) || []).map((f) =>
              f.id === fieldId ? { ...f, ...updates } : f
            );
            return { ...b, content: { ...b.content, fields } };
          }),
          isDirty: true,
        })),

      deleteFormField: (blockId, fieldId) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const fields = ((b.content.fields as any[]) || []).filter((f) => f.id !== fieldId);
            return { ...b, content: { ...b.content, fields } };
          }),
          isDirty: true,
          selectedBlockId: state.selectedBlockId === fieldId ? null : state.selectedBlockId,
        })),

      moveFormField: (blockId, fromIndex, toIndex) =>
        set((state) => ({
          ...state,
          blocks: state.blocks.map((b) => {
            if (b.id !== blockId) return b;
            const fields = [...((b.content.fields as any[]) || [])];
            const [movedField] = fields.splice(fromIndex, 1);
            fields.splice(toIndex, 0, movedField);
            return { ...b, content: { ...b.content, fields } };
          }),
          isDirty: true,
        })),

      setSelectedBlockId: (id) => set({ selectedBlockId: id }),
      setSEO: (seo) => set((state) => ({ ...state, seo: { ...state.seo, ...seo }, isDirty: true })),
      setZoom: (zoom) => set({ zoom }),
      setPan: (pan) => set({ pan }),
      setPreviewDevice: (previewDevice) => set({ previewDevice }),
      setBlockHeight: (id, height) =>
        set((state) => ({ ...state, blockHeights: { ...state.blockHeights, [id]: height } })),
      reset: () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        lastRecordedPartial = JSON.stringify({
          title: "",
          slug: "",
          status: "draft",
          blocks: [],
          seo: {
            metaTitle: "",
            metaDescription: "",
            keywords: [],
            ogImage: "",
          },
        });
        set(initialState as CanvasState);
        (useCanvasStore as any).temporal.getState().clear();
      },
    }),
    {
      limit: 30,
      equality: (a, b) => JSON.stringify(a) === JSON.stringify(b),
      partialize: (state) => ({
        title: state.title,
        slug: state.slug,
        status: state.status,
        blocks: state.blocks,
        seo: state.seo,
      }),
    }
  )
);

if (typeof window !== "undefined") (window as any).useCanvasStore = useCanvasStore;
