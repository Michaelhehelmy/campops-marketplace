import React, { memo, useMemo } from "react";
import { PageBlock } from "@/types/api";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/Button";
import { RichTextEditor } from "./RichTextEditor";
import { ImageIcon, Plus, Video } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import { cn } from "@/lib/utils";
import { FormBlock } from "./FormBlock";
import { FormFieldComponent } from "./FormFieldComponent";

interface BlockComponentProps {
  block: PageBlock;
  parentBlockId?: string;
  columnId?: string;
}

export const BlockComponent: React.FC<BlockComponentProps> = memo(
  ({ block, parentBlockId, columnId }) => {
    const {
      updateBlockDebounced,
      updateNestedBlock,
      addNestedBlock,
      selectedBlockId,
      setSelectedBlockId,
      previewDevice,
    } = useCanvasStore();

    const isSelected = selectedBlockId === block.id;

    const handleUpdate = (updates: Partial<PageBlock>) => {
      if (parentBlockId && columnId) {
        updateNestedBlock(parentBlockId, columnId, block.id, updates);
      } else {
        updateBlockDebounced(block.id, updates);
      }
    };

    const isHiddenOnCurrentDevice =
      (previewDevice === "mobile" && block.settings?.hideOnMobile) ||
      (previewDevice === "tablet" && block.settings?.hideOnTablet) ||
      (previewDevice === "desktop" && block.settings?.hideOnDesktop);

    const content = (
      <div
        className={cn(
          "relative w-full transition-all duration-200",
          parentBlockId && "group/nested",
          isHiddenOnCurrentDevice && "opacity-20 grayscale"
        )}
        style={{
          backgroundColor: block.settings?.backgroundColor || "transparent",
          paddingTop: block.settings?.padding || (parentBlockId ? "0px" : "40px"),
          paddingBottom: block.settings?.padding || (parentBlockId ? "0px" : "40px"),
        }}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedBlockId(block.id);
        }}
      >
        {/* Visibility Indicator */}
        {isHiddenOnCurrentDevice && (
          <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
            <span className="bg-stone-800/80 backdrop-blur-sm text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded shadow-lg">
              Hidden on {previewDevice}
            </span>
          </div>
        )}

        {/* Nested Selection UI */}
        {parentBlockId && isSelected && (
          <div className="absolute -top-6 left-0 bg-oasis text-white px-1.5 py-0.5 rounded-t text-[8px] font-bold uppercase z-20 shadow-sm">
            {block.type}
          </div>
        )}

        {block.type === "hero" && (
          <div className="text-center space-y-6 py-10">
            <RichTextEditor
              content={(block.content.title as string) || "<h1>Hero Title</h1><p></p>"}
              onChange={(html) => handleUpdate({ content: { ...block.content, title: html } })}
              className="text-5xl font-black tracking-tighter text-stone-900"
            />
            <RichTextEditor
              content={
                (block.content.body as string) ||
                "<p>Your compelling hero subtitle goes here. Click to edit.</p>"
              }
              onChange={(html) => handleUpdate({ content: { ...block.content, body: html } })}
              className="text-xl text-stone-500 max-w-2xl mx-auto"
            />
            <Button className="rounded-full px-8 bg-oasis hover:bg-oasis-dark text-white">
              Get Started
            </Button>
          </div>
        )}

        {block.type === "text" && (
          <div className={cn("max-w-3xl mx-auto py-10", parentBlockId && "max-w-full py-2")}>
            <RichTextEditor
              content={(block.content.title as string) || "<h2>Section Heading</h2><p></p>"}
              onChange={(html) => handleUpdate({ content: { ...block.content, title: html } })}
              className="text-3xl font-bold mb-4 text-stone-900"
            />
            <RichTextEditor
              content={
                (block.content.body as string) ||
                "<p>Enter your text content here. Click to edit any part of this message.</p>"
              }
              onChange={(html) => handleUpdate({ content: { ...block.content, body: html } })}
              className="text-stone-600 leading-relaxed"
            />
          </div>
        )}

        {block.type === "image" && (
          <div className="flex flex-col items-center py-6 w-full">
            <div className="relative overflow-hidden rounded-2xl shadow-xl w-full max-w-2xl bg-stone-100 min-h-[150px] flex items-center justify-center border border-stone-200">
              {block.content.src ? (
                <img
                  src={block.content.src as string}
                  alt={(block.content.alt as string) || ""}
                  className="w-full h-auto"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-stone-400 p-8">
                  <ImageIcon size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Image</span>
                </div>
              )}
            </div>
          </div>
        )}

        {block.type === "video" && (
          <div className="flex flex-col items-center py-6 w-full">
            <div className="relative overflow-hidden rounded-2xl shadow-xl w-full aspect-video bg-stone-100 flex items-center justify-center border border-stone-200">
              {block.content.src ? (
                <iframe
                  src={block.content.src as string}
                  className="w-full h-full"
                  title="Video preview"
                  allowFullScreen
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-stone-400 p-8">
                  <Video size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Video</span>
                </div>
              )}
            </div>
          </div>
        )}

        {block.type === "spacer" && (
          <div
            className="w-full flex items-center justify-center border-y border-dashed border-stone-100/50 group/spacer"
            style={{ height: (block.content.height as string | undefined) || "64px" }}
          >
            <div className="opacity-0 group-hover/spacer:opacity-100 text-[8px] font-bold uppercase tracking-widest text-stone-300">
              Spacer: {String(block.content.height ?? "64px")}
            </div>
          </div>
        )}

        {block.type === "button" && (
          <div className="flex justify-center py-4">
            <Button className="rounded-xl px-8 bg-acacia hover:bg-acacia-dark text-white shadow-lg shadow-acacia/20">
              {(block.content.title as string) || "Click Me"}
            </Button>
          </div>
        )}

        {block.type === "form" && <FormBlock block={block} />}

        {block.type === "html" && (
          <div className="w-full py-4 px-4 overflow-hidden">
            <div
              className="prose prose-stone max-w-none"
              dangerouslySetInnerHTML={{
                __html: useMemo(
                  () =>
                    DOMPurify.sanitize((block.content.code as string) || "<!-- Custom HTML -->"),
                  [block.content.code]
                ),
              }}
            />
            <div className="mt-2 flex items-center gap-2 p-2 bg-amber-50 rounded border border-amber-100 text-[8px] text-amber-700 font-bold uppercase tracking-widest pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Custom HTML Block: Code is rendered directly
            </div>
          </div>
        )}

        {block.type.startsWith("form-") && block.type !== "form" && (
          <div className="p-4 border border-dashed border-stone-200 rounded-xl text-center text-xs text-stone-400">
            Form Field: {block.type} (Should be inside a Form Block)
          </div>
        )}

        {block.type === "columns" && (
          <div className="grid grid-cols-2 gap-8 py-10 w-full px-4">
            {((block.content.columns as Array<{ id: string; blocks: PageBlock[] }>) || []).map(
              (col) => (
                <div
                  key={col.id}
                  className="min-h-[150px] border-2 border-dashed border-stone-100 rounded-3xl p-6 transition-colors hover:border-stone-200 relative group/col"
                >
                  {col.blocks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-stone-300">
                      <div className="p-2 bg-stone-50 rounded-full mb-2">
                        <Plus size={16} />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-wider">
                        Empty Column
                      </span>
                      <div className="mt-4 opacity-0 group-hover/col:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[10px] h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            addNestedBlock(block.id, col.id, {
                              id: Date.now().toString(),
                              type: "text",
                              order: 0,
                              content: { title: "Column Item", body: "Edit me..." },
                            });
                          }}
                        >
                          Add Block
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {col.blocks.map((nb: PageBlock) => (
                        <BlockErrorBoundary key={nb.id}>
                          <BlockComponent block={nb} parentBlockId={block.id} columnId={col.id} />
                        </BlockErrorBoundary>
                      ))}
                      {/* Quick Add Button at bottom of column */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full border border-dashed border-stone-100 hover:border-acacia hover:bg-acacia/5 text-stone-400 hover:text-acacia"
                        onClick={(e) => {
                          e.stopPropagation();
                          addNestedBlock(block.id, col.id, {
                            id: Date.now().toString(),
                            type: "text",
                            order: col.blocks.length,
                            content: { title: "New Item", body: "Add details..." },
                          });
                        }}
                      >
                        <Plus size={14} className="mr-1" /> Add
                      </Button>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    );

    return content;
  }
);
