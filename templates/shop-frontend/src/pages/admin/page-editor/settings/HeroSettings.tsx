import React, { FC } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PageBlock } from "@/types/api";

interface HeroSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const HeroSettings: FC<HeroSettingsProps> = ({ block, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hero-title">Title</Label>
        <Input
          id="hero-title"
          value={(block.content.title as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, title: e.target.value } })}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="hero-body">Body</Label>
        <Textarea
          id="hero-body"
          value={(block.content.body as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, body: e.target.value } })}
        />
      </div>
    </div>
  );
};

export default HeroSettings;
