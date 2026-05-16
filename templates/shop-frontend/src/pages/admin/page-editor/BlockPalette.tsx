import React, { FC } from "react";
import { Plus } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { BlockType, PageBlock } from "@/types/api";
import { DEFAULT_IMAGES } from "@/constants/images";

const BLOCK_TYPES = [
  { type: "hero", label: "Hero Section", description: "Main landing area with image and text" },
  { type: "text", label: "Text Block", description: "Rich text content block" },
  { type: "image", label: "Image Block", description: "Single image with caption" },
  { type: "features", label: "Features", description: "Grid of feature items" },
  { type: "cta", label: "Call to Action", description: "Button and message section" },
  { type: "gallery", label: "Gallery", description: "Grid of multiple images" },
  { type: "button", label: "Button", description: "Action button with link" },
  { type: "columns", label: "Columns", description: "Multi-column layout for blocks" },
  { type: "video", label: "Video", description: "Embed YouTube or Vimeo videos" },
  { type: "spacer", label: "Spacer", description: "Add vertical space between sections" },
  { type: "html", label: "Custom HTML", description: "Embed raw HTML code or third-party scripts" },
  { type: "form", label: "Form Builder", description: "Create custom forms with multiple fields" },
] as const;

export const BlockPalette: FC = () => {
  const { addBlock, blocks } = useCanvasStore();

  const handleAddBlock = (type: string) => {
    const generateId = () => crypto.randomUUID();
    const newBlock: PageBlock = {
      id: generateId(),
      type: type as BlockType,
      order: blocks.length,
      content: {
        title:
          type === "hero"
            ? "<h1>New Hero Section</h1><p></p>"
            : type === "text"
              ? "<h2>Section Heading</h2><p></p>"
              : type === "button"
                ? "Click Me"
                : type === "form"
                  ? "Contact Us"
                  : "",
        body:
          type === "text"
            ? "<p>Click to edit this text content...</p>"
            : type === "hero"
              ? "<p>Your compelling hero subtitle goes here. Click to edit.</p>"
              : "",
        url: type === "button" ? "#" : undefined,
        src:
          type === "video"
            ? DEFAULT_IMAGES.VIDEO_PLACEHOLDER
            : type === "image"
              ? DEFAULT_IMAGES.BLOCK_PLACEHOLDER
              : undefined,
        height: type === "spacer" ? "64px" : undefined,
        columns:
          type === "columns"
            ? [
                { id: generateId(), blocks: [] },
                { id: generateId(), blocks: [] },
              ]
            : undefined,
        fields: type === "form" ? [] : undefined,
        code:
          type === "html"
            ? '<!-- Add your custom HTML here -->\n<div class="p-8 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 text-center">\n  <h3 class="text-stone-400 font-bold uppercase tracking-widest text-xs">Custom HTML Placeholder</h3>\n</div>'
            : undefined,
        successMessage: type === "form" ? "Thank you for your submission!" : undefined,
        errorMessage: type === "form" ? "There was an error submitting the form." : undefined,
        method: type === "form" ? "POST" : undefined,
        submitLabel: type === "form" ? "Send Message" : undefined,
      },
    };
    addBlock(newBlock);
  };

  return (
    <div className="w-64 bg-white border-r flex flex-col shadow-lg overflow-hidden">
      <div className="p-4 border-b bg-stone-50/50">
        <h3 className="font-bold text-xs uppercase tracking-wider text-stone-400">Blocks</h3>
      </div>
      <div className="p-4 grid grid-cols-1 gap-3 overflow-y-auto flex-1 custom-scrollbar">
        {BLOCK_TYPES.map((bt) => (
          <button
            key={bt.type}
            className="flex flex-col items-start p-3 rounded-xl border border-stone-100 hover:border-acacia hover:bg-acacia/5 transition-all group text-left focus:outline-none focus:ring-2 focus:ring-acacia"
            onClick={() => handleAddBlock(bt.type)}
            data-testid={`add-${bt.type}-block`}
            aria-label={`Add ${bt.label}`}
            title={`Add ${bt.label}`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="font-bold text-sm text-stone-700 group-hover:text-acacia transition-colors">
                {bt.label}
              </span>
              <Plus
                size={14}
                className="text-stone-300 group-hover:text-acacia transition-colors"
              />
            </div>
            <p className="text-[10px] text-stone-400 leading-tight">{bt.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
