import React, { FC } from "react";
import { PageBlock } from "@/types/api";
import { Label } from "@/components/ui/Label";
import { AlertCircle } from "lucide-react";

interface HtmlSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const HtmlSettings: FC<HtmlSettingsProps> = ({ block, onChange }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label className="text-xs font-bold text-stone-700">HTML Code</Label>
        <div className="relative group">
          <textarea
            className="w-full h-64 p-4 font-mono text-[11px] bg-stone-900 text-stone-100 rounded-xl border-stone-800 focus:ring-2 focus:ring-acacia focus:border-transparent custom-scrollbar resize-none leading-relaxed"
            value={(block.content.code as string) || ""}
            onChange={(e) => onChange({ content: { ...block.content, code: e.target.value } })}
            placeholder="<div>Your HTML here...</div>"
            spellCheck={false}
          />
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="bg-white/10 backdrop-blur-sm text-[8px] text-white/50 px-2 py-1 rounded-md uppercase tracking-widest font-bold border border-white/5">
              Source
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
        <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider">
            Advanced Usage
          </p>
          <p className="text-[10px] text-amber-700 leading-normal">
            Raw HTML is sanitized for security. Some tags (like &lt;script&gt; or &lt;iframe&gt;)
            might be stripped depending on system settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HtmlSettings;
