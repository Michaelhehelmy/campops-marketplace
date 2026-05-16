import React, { FC } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { PageBlock } from "@/types/api";

interface ButtonSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const ButtonSettings: FC<ButtonSettingsProps> = ({ block, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="btn-text">Button Text</Label>
        <Input
          id="btn-text"
          value={(block.content.title as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, title: e.target.value } })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="btn-url">Link URL</Label>
        <Input
          id="btn-url"
          value={(block.content.url as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, url: e.target.value } })}
          placeholder="https://... or /path"
        />
      </div>
    </div>
  );
};

export default ButtonSettings;
