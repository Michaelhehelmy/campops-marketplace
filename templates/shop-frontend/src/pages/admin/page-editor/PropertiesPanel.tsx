import React, { FC } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { Button } from "@/components/ui/Button";
import { Label } from "@/components/ui/Label";
import { Trash, Copy, Image as ImageIcon, X, Smartphone, Tablet, Monitor } from "lucide-react";

import HeroSettings from "./settings/HeroSettings";
import TextSettings from "./settings/TextSettings";
import ImageSettings from "./settings/ImageSettings";
import ButtonSettings from "./settings/ButtonSettings";
import ColumnsSettings from "./settings/ColumnsSettings";
import FormSettings from "./settings/FormSettings";
import FieldSettings from "./settings/FieldSettings";
import HtmlSettings from "./settings/HtmlSettings";

export const PropertiesPanel: FC = () => {
  const {
    blocks,
    selectedBlockId,
    setSelectedBlockId,
    updateBlock,
    deleteBlock,
    addBlock,
    updateFormField,
    deleteFormField,
  } = useCanvasStore();

  // Find block at top level or nested within form fields
  let selectedBlock = blocks.find((b) => b.id === selectedBlockId);
  let parentBlockId: string | null = null;

  if (!selectedBlock && selectedBlockId) {
    for (const b of blocks) {
      if (b.type === "form") {
        const field = (b.content.fields as any[])?.find((f) => f.id === selectedBlockId);
        if (field) {
          selectedBlock = field;
          parentBlockId = b.id;
          break;
        }
      }
    }
  }

  if (!selectedBlock) {
    return (
      <div
        className="w-80 bg-white border-l flex flex-col items-center justify-center p-8 text-center"
        data-testid="nothing-selected"
      >
        <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
          <ImageIcon size={32} className="text-stone-200" />
        </div>
        <h3 className="text-stone-400 font-bold text-sm uppercase tracking-widest">
          Nothing Selected
        </h3>
        <p className="text-stone-300 text-xs mt-2">
          Click a block or field on the canvas to edit its properties
        </p>
      </div>
    );
  }

  const index = blocks.findIndex((b) => b.id === selectedBlockId);

  const duplicateBlock = () => {
    if (parentBlockId) return; // Nested duplication not yet implemented
    const newBlock = {
      ...selectedBlock!,
      id: crypto.randomUUID(),
      order: index + 1,
    };
    addBlock(newBlock, index + 1);
  };

  const handleUpdate = (updates: Partial<typeof selectedBlock>) => {
    if (parentBlockId) {
      updateFormField(parentBlockId, selectedBlockId!, updates);
    } else {
      updateBlock(selectedBlockId!, updates);
    }
  };

  return (
    <div
      className="w-80 bg-white border-l flex flex-col shadow-lg overflow-hidden"
      data-testid="block-properties"
    >
      <div className="p-4 border-b bg-stone-50/50 flex items-center justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-stone-400">
          Properties: {selectedBlock.type}
        </h3>
        <button
          onClick={() => setSelectedBlockId(null)}
          className="text-stone-400 hover:text-stone-600 transition-colors"
          aria-label="Close properties"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-8">
        <div className="space-y-6">
          <Label className="text-[10px] uppercase tracking-widest text-stone-400 block mb-4">
            Content Settings
          </Label>
          {selectedBlock.type === "hero" && (
            <HeroSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type === "text" && (
            <TextSettings block={selectedBlock} onChange={handleUpdate} />
          )}

          {selectedBlock.type === "image" && (
            <ImageSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type === "button" && (
            <ButtonSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type === "columns" && (
            <ColumnsSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type === "form" && (
            <FormSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type === "html" && (
            <HtmlSettings block={selectedBlock} onChange={handleUpdate} />
          )}
          {selectedBlock.type.startsWith("form-") && selectedBlock.type !== "form" && (
            <FieldSettings block={selectedBlock} onChange={handleUpdate} />
          )}
        </div>

        <div className="pt-8 border-t space-y-4">
          <Label className="text-[10px] uppercase tracking-widest text-stone-400 block mb-2">
            Visibility
          </Label>
          <div className="flex flex-col gap-2">
            {[
              { key: "hideOnMobile", id: "mobile", label: "Hide on Mobile", icon: Smartphone },
              { key: "hideOnTablet", id: "tablet", label: "Hide on Tablet", icon: Tablet },
              { key: "hideOnDesktop", id: "desktop", label: "Hide on Desktop", icon: Monitor },
            ].map(({ key, id, label, icon: Icon }) => (
              <label
                key={key}
                className="flex items-center justify-between p-2 rounded-lg border border-stone-100 hover:bg-stone-50 transition-colors cursor-pointer"
                data-testid={`visibility-${id}`}
              >
                <div className="flex items-center gap-2">
                  <Icon size={14} className="text-stone-400" />
                  <span className="text-xs text-stone-600">{label}</span>
                </div>
                <input
                  type="checkbox"
                  className="rounded border-stone-300 text-acacia focus:ring-acacia"
                  checked={!!(selectedBlock.settings as any)?.[key]}
                  onChange={(e) => {
                    updateBlock(selectedBlockId!, {
                      settings: { ...selectedBlock.settings, [key]: e.target.checked },
                    });
                  }}
                  data-testid={`checkbox-${id}`}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="pt-8 border-t space-y-4">
          <Label className="text-[10px] uppercase tracking-widest text-stone-400 block mb-2">
            Styles
          </Label>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={selectedBlock.settings?.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    updateBlock(selectedBlockId!, {
                      settings: { ...selectedBlock.settings, backgroundColor: e.target.value },
                    })
                  }
                  className="h-8 w-12 rounded border p-0 overflow-hidden"
                  data-testid="background-color-input"
                />
                <input
                  type="text"
                  value={selectedBlock.settings?.backgroundColor || "#ffffff"}
                  onChange={(e) =>
                    updateBlock(selectedBlockId!, {
                      settings: { ...selectedBlock.settings, backgroundColor: e.target.value },
                    })
                  }
                  className="flex-1 h-8 text-xs border rounded px-2"
                  placeholder="#ffffff"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Vertical Spacing (px)</Label>
              <input
                type="range"
                min="0"
                max="200"
                step="8"
                value={parseInt(selectedBlock.settings?.padding || "40")}
                onChange={(e) =>
                  updateBlock(selectedBlockId!, {
                    settings: { ...selectedBlock.settings, padding: `${e.target.value}px` },
                  })
                }
                className="w-full accent-acacia"
                data-testid="spacing-slider"
              />
            </div>
          </div>
        </div>

        <div className="pt-8 border-t space-y-3">
          <Label className="text-[10px] uppercase tracking-widest text-stone-400 block mb-4">
            Actions
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={duplicateBlock}
              className="text-xs h-9"
              data-testid="duplicate-block"
            >
              <Copy size={14} className="mr-2" /> Duplicate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteBlock(selectedBlockId!)}
              className="text-xs h-9 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100"
              data-testid="delete-block"
            >
              <Trash size={14} className="mr-2" /> Delete
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
