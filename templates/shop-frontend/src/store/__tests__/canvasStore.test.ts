import { describe, it, expect, beforeEach, vi } from "vitest";
import { useCanvasStore } from "../canvasStore";

const makeBlock = (id: string, extra?: any) => ({
  id,
  type: "text",
  content: { text: "Hello" },
  settings: {},
  styles: {},
  ...extra,
});

const makeNestedBlock = (id: string) => ({
  id,
  type: "columns",
  content: {
    columns: [
      {
        id: "col-1",
        blocks: [makeBlock("inner-1")],
      },
    ],
  },
  settings: {},
  styles: {},
});

describe("canvasStore", () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  it("sets page data", () => {
    useCanvasStore.getState().setPageData({
      title: "My Page",
      slug: "my-page",
      status: "published",
      content: [makeBlock("b1")],
      seo: { metaTitle: "Meta" } as any,
    });
    const state = useCanvasStore.getState();
    expect(state.title).toBe("My Page");
    expect(state.slug).toBe("my-page");
    expect(state.status).toBe("published");
    expect(state.blocks).toHaveLength(1);
    expect(state.isDirty).toBe(false);
  });

  it("sets title, slug, status as dirty", () => {
    useCanvasStore.getState().setTitle("T");
    useCanvasStore.getState().setSlug("s");
    useCanvasStore.getState().setStatus("published");
    const s = useCanvasStore.getState();
    expect(s.isDirty).toBe(true);
    expect(s.title).toBe("T");
    expect(s.slug).toBe("s");
    expect(s.status).toBe("published");
  });

  it("adds a block without index (appends)", () => {
    const b = makeBlock("b1");
    useCanvasStore.getState().addBlock(b);
    expect(useCanvasStore.getState().blocks).toHaveLength(1);
    expect(useCanvasStore.getState().selectedBlockId).toBe("b1");
  });

  it("adds a block at a specific index", () => {
    useCanvasStore.getState().addBlock(makeBlock("b1"));
    useCanvasStore.getState().addBlock(makeBlock("b2"), 0);
    expect(useCanvasStore.getState().blocks[0].id).toBe("b2");
    expect(useCanvasStore.getState().blocks[1].id).toBe("b1");
  });

  it("deletes a block", () => {
    useCanvasStore.getState().addBlock(makeBlock("b1"));
    useCanvasStore.getState().setSelectedBlockId("b1");
    useCanvasStore.getState().deleteBlock("b1");
    expect(useCanvasStore.getState().blocks).toHaveLength(0);
    expect(useCanvasStore.getState().selectedBlockId).toBeNull();
  });

  it("updates a block", () => {
    useCanvasStore.getState().addBlock(makeBlock("b1"));
    useCanvasStore.getState().updateBlock("b1", { content: { text: "Updated" } });
    const block = useCanvasStore.getState().blocks.find((b) => b.id === "b1");
    expect(block?.content.text).toBe("Updated");
  });

  it("updates a block with debounce", () => {
    vi.useFakeTimers();
    useCanvasStore.getState().addBlock(makeBlock("b1"));
    useCanvasStore.getState().updateBlockDebounced("b1", { content: { text: "Debounced" } });
    vi.advanceTimersByTime(300);
    const block = useCanvasStore.getState().blocks.find((b) => b.id === "b1");
    expect(block?.content.text).toBe("Debounced");
    vi.useRealTimers();
  });

  it("moves a block", () => {
    useCanvasStore.getState().addBlock(makeBlock("b1"));
    useCanvasStore.getState().addBlock(makeBlock("b2"));
    useCanvasStore.getState().moveBlock(0, 1);
    expect(useCanvasStore.getState().blocks[0].id).toBe("b2");
    expect(useCanvasStore.getState().blocks[1].id).toBe("b1");
  });

  it("sets SEO fields", () => {
    useCanvasStore.getState().setSEO({ metaTitle: "Test Title", metaDescription: "Desc" });
    const seo = useCanvasStore.getState().seo;
    expect(seo.metaTitle).toBe("Test Title");
    expect(seo.metaDescription).toBe("Desc");
    expect(useCanvasStore.getState().isDirty).toBe(true);
  });

  it("sets zoom, pan, and preview device", () => {
    useCanvasStore.getState().setZoom(1.5);
    useCanvasStore.getState().setPan({ x: 10, y: 20 });
    useCanvasStore.getState().setPreviewDevice("mobile");
    const s = useCanvasStore.getState();
    expect(s.zoom).toBe(1.5);
    expect(s.pan).toEqual({ x: 10, y: 20 });
    expect(s.previewDevice).toBe("mobile");
  });

  it("sets block height", () => {
    useCanvasStore.getState().setBlockHeight("b1", 200);
    expect(useCanvasStore.getState().blockHeights["b1"]).toBe(200);
  });

  it("sets selected block id", () => {
    useCanvasStore.getState().setSelectedBlockId("block-123");
    expect(useCanvasStore.getState().selectedBlockId).toBe("block-123");
    useCanvasStore.getState().setSelectedBlockId(null);
    expect(useCanvasStore.getState().selectedBlockId).toBeNull();
  });

  it("resets state", () => {
    useCanvasStore.getState().setTitle("Before reset");
    useCanvasStore.getState().reset();
    expect(useCanvasStore.getState().title).toBe("");
    expect(useCanvasStore.getState().isDirty).toBe(false);
  });

  describe("nested blocks", () => {
    it("adds a nested block", () => {
      useCanvasStore.getState().addBlock(makeNestedBlock("parent-1"));
      useCanvasStore.getState().addNestedBlock("parent-1", "col-1", makeBlock("inner-2"));
      const parent = useCanvasStore.getState().blocks.find((b) => b.id === "parent-1");
      const col = (parent?.content.columns as any[])?.find((c: any) => c.id === "col-1");
      expect(col?.blocks).toHaveLength(2);
    });

    it("adds a nested block at a specific index", () => {
      useCanvasStore.getState().addBlock(makeNestedBlock("parent-1"));
      useCanvasStore.getState().addNestedBlock("parent-1", "col-1", makeBlock("inner-0"), 0);
      const parent = useCanvasStore.getState().blocks.find((b) => b.id === "parent-1");
      const col = (parent?.content.columns as any[])?.find((c: any) => c.id === "col-1");
      expect(col?.blocks[0].id).toBe("inner-0");
    });

    it("updates a nested block", () => {
      useCanvasStore.getState().addBlock(makeNestedBlock("parent-1"));
      useCanvasStore
        .getState()
        .updateNestedBlock("parent-1", "col-1", "inner-1", { content: { text: "Nested Updated" } });
      const parent = useCanvasStore.getState().blocks.find((b) => b.id === "parent-1");
      const col = (parent?.content.columns as any[])?.find((c: any) => c.id === "col-1");
      expect(col?.blocks[0].content.text).toBe("Nested Updated");
    });

    it("deletes a nested block", () => {
      useCanvasStore.getState().addBlock(makeNestedBlock("parent-1"));
      useCanvasStore.getState().deleteNestedBlock("parent-1", "col-1", "inner-1");
      const parent = useCanvasStore.getState().blocks.find((b) => b.id === "parent-1");
      const col = (parent?.content.columns as any[])?.find((c: any) => c.id === "col-1");
      expect(col?.blocks).toHaveLength(0);
    });
  });

  describe("form fields", () => {
    it("adds a form field", () => {
      useCanvasStore.getState().addBlock({
        id: "form-1",
        type: "form",
        content: { fields: [] },
        settings: {},
        styles: {},
      });
      useCanvasStore.getState().addFormField("form-1", makeBlock("field-1"));
      const formBlock = useCanvasStore.getState().blocks.find((b) => b.id === "form-1");
      expect((formBlock?.content.fields as any[])?.length).toBe(1);
    });

    it("adds a form field at index", () => {
      useCanvasStore.getState().addBlock({
        id: "form-1",
        type: "form",
        content: { fields: [makeBlock("field-1")] },
        settings: {},
        styles: {},
      });
      useCanvasStore.getState().addFormField("form-1", makeBlock("field-0"), 0);
      const formBlock = useCanvasStore.getState().blocks.find((b) => b.id === "form-1");
      expect((formBlock?.content.fields as any[])?.[0].id).toBe("field-0");
    });

    it("updates a form field", () => {
      useCanvasStore.getState().addBlock({
        id: "form-1",
        type: "form",
        content: { fields: [makeBlock("field-1")] },
        settings: {},
        styles: {},
      });
      useCanvasStore
        .getState()
        .updateFormField("form-1", "field-1", { content: { text: "Updated Field" } });
      const formBlock = useCanvasStore.getState().blocks.find((b) => b.id === "form-1");
      const field = (formBlock?.content.fields as any[])?.[0];
      expect(field?.content.text).toBe("Updated Field");
    });

    it("deletes a form field", () => {
      useCanvasStore.getState().addBlock({
        id: "form-1",
        type: "form",
        content: { fields: [makeBlock("field-1")] },
        settings: {},
        styles: {},
      });
      useCanvasStore.getState().setSelectedBlockId("field-1");
      useCanvasStore.getState().deleteFormField("form-1", "field-1");
      const formBlock = useCanvasStore.getState().blocks.find((b) => b.id === "form-1");
      expect((formBlock?.content.fields as any[])?.length).toBe(0);
      expect(useCanvasStore.getState().selectedBlockId).toBeNull();
    });

    it("moves a form field", () => {
      useCanvasStore.getState().addBlock({
        id: "form-1",
        type: "form",
        content: { fields: [makeBlock("field-1"), makeBlock("field-2")] },
        settings: {},
        styles: {},
      });
      useCanvasStore.getState().moveFormField("form-1", 0, 1);
      const formBlock = useCanvasStore.getState().blocks.find((b) => b.id === "form-1");
      expect((formBlock?.content.fields as any[])?.[0].id).toBe("field-2");
      expect((formBlock?.content.fields as any[])?.[1].id).toBe("field-1");
    });
  });
});
