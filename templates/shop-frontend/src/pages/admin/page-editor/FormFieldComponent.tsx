import React from "react";
import { PageBlock } from "@/types/api";
import { Input, Textarea, Label, Select } from "@/components/ui";
import { Checkbox } from "@/components/ui/checkbox";

import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

interface FormFieldComponentProps {
  field: PageBlock;
  onUpdate: (updates: Partial<PageBlock>) => void;
  onDelete: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const FormFieldComponent: React.FC<FormFieldComponentProps> = ({
  field,
  onUpdate,
  onDelete,
  isSelected,
  onSelect,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = (field.content.label as string) || "Label";
  const name = (field.content.name as string) || "field";
  const placeholder = (field.content.placeholder as string) || "";
  const required = !!field.content.required;

  const renderField = () => {
    switch (field.type) {
      case "form-text-input":
        return <Input disabled placeholder={placeholder} className="bg-white/50" />;
      case "form-textarea":
        return <Textarea disabled placeholder={placeholder} className="bg-white/50" />;
      case "form-checkbox":
        return (
          <div className="flex items-center space-x-2">
            <Checkbox disabled id={field.id} checked={!!field.content.defaultChecked} />
            <Label
              htmlFor={field.id}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              {label}
            </Label>
          </div>
        );
      case "form-select":
        return (
          <Select
            disabled
            placeholder={placeholder || "Select an option"}
            options={((field.content.options as string[]) || []).map((opt) => ({
              value: opt,
              label: opt,
            }))}
          />
        );

      case "form-submit-button":
        return (
          <div className="pt-2">
            <button
              disabled
              className="w-full py-2 px-4 bg-acacia text-white rounded-xl font-bold shadow-lg shadow-acacia/20 opacity-90"
            >
              {label || "Submit"}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-stone-50/50 border border-stone-200 rounded-xl p-4 transition-all hover:border-acacia/30",
        isSelected && "ring-2 ring-acacia border-transparent bg-white shadow-sm",
        isDragging && "opacity-50 z-50 shadow-2xl"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1">
          {field.type !== "form-checkbox" && field.type !== "form-submit-button" && (
            <Label className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-1.5 block">
              {label} {required && <span className="text-red-500">*</span>}
            </Label>
          )}
          {renderField()}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            {...attributes}
            {...listeners}
            className="p-1 hover:bg-stone-100 rounded cursor-grab active:cursor-grabbing text-stone-400"
            title="Drag to reorder"
          >
            <GripVertical size={14} />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 hover:bg-red-50 hover:text-red-500 rounded text-stone-400 transition-colors"
            title="Delete field"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isSelected && (
        <div className="absolute -top-2 -right-2 bg-acacia text-white text-[8px] font-bold uppercase px-1.5 py-0.5 rounded shadow-sm z-10">
          {field.type.replace("form-", "")}
        </div>
      )}
    </div>
  );
};
