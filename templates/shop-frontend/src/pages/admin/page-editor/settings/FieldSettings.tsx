import React from "react";
import { PageBlock } from "@/types/api";
import { Input, Label, Switch, Button } from "@/components/ui";

import { Plus, X } from "lucide-react";

interface FieldSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const FieldSettings: React.FC<FieldSettingsProps> = ({ block, onChange }) => {
  const content = block.content;

  const handleChange = (key: string, value: any) => {
    onChange({ content: { ...content, [key]: value } });
  };

  const options = (content.options as string[]) || [];

  const handleAddOption = () => {
    handleChange("options", [...options, `Option ${options.length + 1}`]);
  };

  const handleUpdateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    handleChange("options", newOptions);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    handleChange("options", newOptions);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-stone-600">Field Label</Label>
        <Input
          value={(content.label as string) || ""}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="e.g., Full Name"
          className="bg-stone-50 border-stone-200"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-bold text-stone-600">Field Name (ID)</Label>
        <Input
          value={(content.name as string) || ""}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g., full_name"
          className="bg-stone-50 border-stone-200 font-mono text-[10px]"
        />
        <p className="text-[10px] text-stone-400 italic">
          This is used as the key in the submitted data.
        </p>
      </div>

      {block.type !== "form-checkbox" && block.type !== "form-submit-button" && (
        <div className="space-y-2">
          <Label className="text-xs font-bold text-stone-600">Placeholder</Label>
          <Input
            value={(content.placeholder as string) || ""}
            onChange={(e) => handleChange("placeholder", e.target.value)}
            placeholder="e.g., Enter your name..."
            className="bg-stone-50 border-stone-200"
          />
        </div>
      )}

      <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
        <div className="space-y-0.5">
          <Label className="text-xs font-bold text-stone-700">Required Field</Label>
          <p className="text-[10px] text-stone-400">Validate before submission</p>
        </div>
        <Switch
          checked={!!content.required}
          onCheckedChange={(val) => handleChange("required", val)}
        />
      </div>

      {block.type === "form-select" && (
        <div className="pt-4 border-t space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-stone-600">Select Options</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddOption}
              className="h-7 text-[10px] px-2 text-acacia"
            >
              <Plus size={12} className="mr-1" /> Add Option
            </Button>
          </div>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  value={opt}
                  onChange={(e) => handleUpdateOption(i, e.target.value)}
                  className="bg-white border-stone-200 h-8 text-xs"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOption(i)}
                  className="h-8 w-8 text-stone-400 hover:text-red-500"
                >
                  <X size={14} />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {block.type === "form-checkbox" && (
        <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
          <div className="space-y-0.5">
            <Label className="text-xs font-bold text-stone-700">Default Checked</Label>
          </div>
          <Switch
            checked={!!content.defaultChecked}
            onCheckedChange={(val) => handleChange("defaultChecked", val)}
          />
        </div>
      )}
    </div>
  );
};

export default FieldSettings;
