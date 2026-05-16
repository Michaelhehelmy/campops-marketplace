import React, { FC } from "react";
import { Label } from "@/components/ui/Label";
import { PageBlock } from "@/types/api";
import { Button } from "@/components/ui/Button";
import { Trash, Plus } from "lucide-react";

interface ColumnsSettingsProps {
  block: PageBlock;
  onChange: (updates: Partial<PageBlock>) => void;
}

const ColumnsSettings: FC<ColumnsSettingsProps> = ({ block, onChange }) => {
  const columns = (block.content.columns as Array<{ id: string; blocks: PageBlock[] }>) || [];

  const addColumn = () => {
    const newColumns = [...columns, { id: Date.now().toString(), blocks: [] }];
    onChange({ content: { ...block.content, columns: newColumns } });
  };

  const removeColumn = (id: string) => {
    const newColumns = columns.filter((c) => c.id !== id);
    onChange({ content: { ...block.content, columns: newColumns } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Columns ({columns.length})</Label>
        <Button variant="outline" size="sm" onClick={addColumn} className="h-7 text-[10px]">
          <Plus size={12} className="mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-2">
        {columns.map((col, index) => (
          <div
            key={col.id}
            className="flex items-center justify-between p-2 bg-stone-50 rounded-lg border border-stone-100"
          >
            <span className="text-xs font-medium text-stone-600">Column {index + 1}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-stone-400 hover:text-red-500"
              onClick={() => removeColumn(col.id)}
              disabled={columns.length <= 1}
            >
              <Trash size={12} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ColumnsSettings;
