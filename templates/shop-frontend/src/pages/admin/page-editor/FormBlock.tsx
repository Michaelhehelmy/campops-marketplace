import React, { useState } from "react";
import { PageBlock, BlockType } from "@/types/api";
import { useCanvasStore } from "@/store/canvasStore";
import { FormFieldComponent } from "./FormFieldComponent";
import { Button } from "@/components/ui";

import { Plus, Layout, Database, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// Alias DndContext to bypass ReactNode mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DndContextAny = DndContext as any;

interface FormBlockProps {
  block: PageBlock;
}

const FIELD_TYPES = [
  { type: "form-text-input", label: "Text Input", icon: <Layout size={14} /> },
  { type: "form-textarea", label: "Textarea", icon: <Layout size={14} /> },
  { type: "form-select", label: "Select", icon: <Layout size={14} /> },
  { type: "form-checkbox", label: "Checkbox", icon: <Layout size={14} /> },
  { type: "form-submit-button", label: "Submit Button", icon: <Send size={14} /> },
];

export const FormBlock: React.FC<FormBlockProps> = ({ block }) => {
  const {
    addFormField,
    updateFormField,
    deleteFormField,
    moveFormField,
    selectedBlockId,
    setSelectedBlockId,
  } = useCanvasStore();

  const [isAddingField, setIsAddingField] = useState(false);

  const fields = (block.content.fields as PageBlock[]) || [];
  const apiEndpoint = (block.content.apiEndpoint as string) || "";
  const functionId = (block.content.functionId as string) || "";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      moveFormField(block.id, oldIndex, newIndex);
    }
  };

  const handleAddField = (type: string) => {
    const newField: PageBlock = {
      id: crypto.randomUUID(),
      type: type as BlockType,
      order: fields.length,
      content: {
        label: type === "form-submit-button" ? "Submit" : "New Field",
        name: `field_${fields.length + 1}`,
        placeholder: "Enter value...",
        required: false,
        options: type === "form-select" ? ["Option 1", "Option 2"] : undefined,
      },
    };
    addFormField(block.id, newField);
    setIsAddingField(false);
  };

  const isSelected = selectedBlockId === block.id;

  return (
    <div
      className={cn(
        "max-w-2xl mx-auto py-10 px-6 bg-white border rounded-3xl shadow-sm relative overflow-hidden group/form transition-all cursor-pointer",
        isSelected ? "border-oasis ring-4 ring-oasis/10" : "border-stone-100 hover:border-stone-200"
      )}
      data-testid="form-block"
      onClick={() => setSelectedBlockId(block.id)}
    >
      {/* Form Header / Configuration Overlay */}
      <div className="mb-8 pb-6 border-b border-stone-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-black text-stone-800 tracking-tight">
            {(block.content.title as string) || "Form Title"}
          </h2>
          <div className="flex items-center gap-2">
            {functionId ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-oasis/10 text-oasis rounded-lg text-[10px] font-bold uppercase tracking-wider">
                <Database size={12} />
                Function: {functionId}
              </div>
            ) : apiEndpoint ? (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                <Database size={12} />
                API: {apiEndpoint}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 text-stone-400 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                Not Connected
              </div>
            )}
          </div>
        </div>
        <p className="text-stone-500 text-sm">
          {(block.content.description as string) ||
            "Configure your form fields and submission logic below."}
        </p>
      </div>

      {/* Fields List with DnD */}
      <DndContextAny
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {fields.map((field) => (
              <FormFieldComponent
                key={field.id}
                field={field}
                onUpdate={(updates) => updateFormField(block.id, field.id, updates)}
                onDelete={() => deleteFormField(block.id, field.id)}
                isSelected={selectedBlockId === field.id}
                onSelect={() => setSelectedBlockId(field.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContextAny>

      {/* Empty State */}
      {fields.length === 0 && (
        <div className="py-20 border-2 border-dashed border-stone-100 rounded-2xl flex flex-col items-center justify-center text-stone-300">
          <Layout size={40} className="mb-4 opacity-20" />
          <p className="text-sm font-medium uppercase tracking-widest">No fields added yet</p>
        </div>
      )}

      {/* Add Field Palette */}
      <div className="mt-8 pt-6 border-t border-stone-100 flex justify-center">
        {!isAddingField ? (
          <Button
            onClick={() => setIsAddingField(true)}
            variant="outline"
            className="rounded-full px-6 border-stone-200 text-stone-500 hover:bg-acacia hover:text-white hover:border-acacia transition-all"
          >
            <Plus size={16} className="mr-2" />
            Add Form Field
          </Button>
        ) : (
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 w-full animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-400">
                Select Field Type
              </span>
              <button
                onClick={() => setIsAddingField(false)}
                className="text-[10px] font-bold text-stone-400 hover:text-stone-600"
              >
                Cancel
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.type}
                  onClick={() => handleAddField(ft.type)}
                  className="flex items-center gap-3 p-3 bg-white border border-stone-100 rounded-xl hover:border-acacia hover:bg-acacia/5 transition-all text-left"
                >
                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover:text-acacia">
                    {ft.icon}
                  </div>
                  <span className="text-xs font-bold text-stone-600">{ft.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
