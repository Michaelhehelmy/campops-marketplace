import React, { FC } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PageBlock } from "@/types/api";

interface TextSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const TextSettings: FC<TextSettingsProps> = ({ block, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="text-title">Heading</Label>
        <Input
          id="text-title"
          value={(block.content.title as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, title: e.target.value } })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="text-body">Body Text</Label>
        <Textarea
          id="text-body"
          value={(block.content.body as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, body: e.target.value } })}
          className="min-h-[150px]"
        />
      </div>
    </div>
  );
};

export default TextSettings;
