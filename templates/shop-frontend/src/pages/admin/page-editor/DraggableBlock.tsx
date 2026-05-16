import React, { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { PageBlock } from "@/types/api";
import { GripVertical } from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface DraggableBlockProps {
  block: PageBlock;
  index: number;
  isSelected: boolean;
  children: ReactNode;
}

export const DraggableBlock: FC<DraggableBlockProps> = ({ block, index, isSelected, children }) => {
  const { setSelectedBlockId, setBlockHeight } = useCanvasStore();
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Report height for virtual scrolling
  React.useEffect(() => {
    if (!contentRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0].contentRect.height;
      if (height > 0) {
        // Only update if height changed significantly to avoid loops
        setBlockHeight(block.id, height);
      }
    });

    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [block.id, setBlockHeight]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedBlockId(block.id);
      }}
      role="listitem"
      aria-selected={isSelected}
      className={cn(
        "relative group transition-all duration-200 min-h-[100px]",
        isSelected
          ? "ring-2 ring-acacia ring-inset z-10"
          : "hover:ring-1 hover:ring-stone-200 ring-inset",
        isDragging ? "opacity-30 scale-[0.98] grayscale-[0.5]" : "opacity-100"
      )}
      data-testid={`block-${block.type}-${index}`}
    >
      {/* Block Selection UI */}
      {isSelected && (
        <>
          <div className="absolute -top-10 left-0 flex items-center gap-1 bg-acacia text-white px-2 py-1 rounded-t-lg shadow-lg text-[10px] font-bold uppercase tracking-widest z-20">
            {block.type}
          </div>
          {/* Selection Handles */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-acacia rounded-sm z-20" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-acacia rounded-sm z-20" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-acacia rounded-sm z-20" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-acacia rounded-sm z-20" />
        </>
      )}

      {/* Drag Handle Overlay */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 bg-white shadow-md border rounded-md z-10"
        aria-label={`Drag ${block.type} block to reorder`}
        title={`Drag to reorder (or use Space/Arrow keys)`}
        data-testid="drag-handle"
      >
        <GripVertical size={16} className="text-stone-400" />
      </div>

      {/* Block Content Wrapper */}
      <div ref={contentRef} className="p-12 pointer-events-none">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>
  );
};
