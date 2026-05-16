import React, { FC } from "react";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageBlock } from "@/types/api";
import { Upload } from "lucide-react";

interface ImageSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const ImageSettings: FC<ImageSettingsProps> = ({ block, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Source URL</Label>
        <div className="flex gap-2">
          <Input
            value={(block.content.src as string) || ""}
            onChange={(e) => onChange({ content: { ...block.content, src: e.target.value } })}
            placeholder="https://..."
          />
          <Button variant="outline" size="icon" className="shrink-0">
            <Upload size={16} />
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="image-alt">Alt Text</Label>
        <Input
          id="image-alt"
          value={(block.content.alt as string) || ""}
          onChange={(e) => onChange({ content: { ...block.content, alt: e.target.value } })}
          placeholder="Describe the image"
        />
      </div>
      {(block.content.src as string | undefined) && (
        <div className="pt-2">
          <Label className="mb-2 block">Preview</Label>
          <img
            src={block.content.src as string}
            alt="Preview"
            className="w-full h-32 object-cover rounded-lg border"
          />
        </div>
      )}
    </div>
  );
};

export default ImageSettings;
