import React, { useRef, useState, useEffect, FC, MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { useCanvasStore } from "@/store/canvasStore";
import { DraggableBlock } from "./DraggableBlock";
import { BlockErrorBoundary } from "./BlockErrorBoundary";
import { Plus, Monitor } from "lucide-react";
import { BlockComponent } from "./BlockComponent";

// dnd-kit imports — aliased to `any` to work around ReactNode type mismatch
// between @dnd-kit/core and the project's @types/react version.
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DndContextAny = DndContext as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SortableContextAny = SortableContext as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DragOverlayAny = DragOverlay as any;

export const EditorCanvas: FC = () => {
  const {
    blocks,
    setBlocks,
    moveBlock,
    selectedBlockId,
    zoom,
    pan,
    setPan,
    previewDevice,
    blockHeights,
  } = useCanvasStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    console.log("DRAG END:", active.id, over?.id);
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((block) => block.id === active.id);
      const newIndex = blocks.findIndex((block) => block.id === over.id);
      console.log("MOVING BLOCK:", oldIndex, "to", newIndex);
      moveBlock(oldIndex, newIndex);
    }
    setActiveId(null);
  };

  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  const [isPanning, setIsPanning] = useState(false);
  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1);
  const lastTouchRef = useRef<{ x: number; y: number } | null>(null);

  // Canvas interactions
  const handleMouseDown = (e: MouseEvent) => {
    if (e.altKey || e.button === 1) {
      setIsPanning(true);
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isPanning) {
      setPan((prev: { x: number; y: number }) => ({
        x: prev.x + e.movementX / zoom,
        y: prev.y + e.movementY / zoom,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Touch interactions
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      // Panning with one finger if on background or specific mode
      // For now let's assume one finger pan is active if not dragging a block
      setIsPanning(true);
    } else if (e.touches.length === 2) {
      setIsPanning(false);
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isPanning && lastTouchRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouchRef.current.x;
      const dy = touch.clientY - lastTouchRef.current.y;

      setPan((prev: { x: number; y: number }) => ({
        x: prev.x + dx / zoom,
        y: prev.y + dy / zoom,
      }));

      lastTouchRef.current = { x: touch.clientX, y: touch.clientY };
    } else if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scale = dist / touchStartDistRef.current;
      const newZoom = Math.min(Math.max(touchStartZoomRef.current * scale, 0.5), 2);
      useCanvasStore.getState().setZoom(newZoom);
    }
  };

  const handleTouchEnd = () => {
    setIsPanning(false);
    touchStartDistRef.current = null;
    lastTouchRef.current = null;
  };

  return (
    <div
      className="flex-1 h-full w-full bg-stone-50 overflow-auto relative custom-scrollbar select-none touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="min-h-full min-w-full p-10 md:p-20 flex flex-col items-start origin-top">
        <DndContextAny
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <div
            ref={canvasRef}
            className={cn(
              "bg-white shadow-2xl min-h-[800px] overflow-hidden transition-all duration-300",
              previewDevice === "desktop"
                ? "w-[1200px]"
                : previewDevice === "tablet"
                  ? "w-[768px]"
                  : "w-[375px]"
            )}
            style={{
              transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              transformOrigin: "top center",
              cursor: isPanning ? "grabbing" : "default",
            }}
            data-testid="page-editor-canvas"
          >
            {blocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 border-4 border-dashed border-stone-100 m-8 rounded-3xl">
                <div className="bg-stone-50 p-6 rounded-full mb-6">
                  <Monitor size={48} className="text-stone-200" />
                </div>
                <h2 className="text-2xl font-bold text-stone-300 mb-2">Empty Canvas</h2>
                <p className="text-stone-400 text-sm max-w-xs text-center">
                  Select a block from the left palette to start building your page.
                </p>
              </div>
            ) : (
              <SortableContextAny
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                {blocks.map((block, index) => (
                  <BlockErrorBoundary key={block.id}>
                    <DraggableBlock
                      block={block}
                      index={index}
                      isSelected={selectedBlockId === block.id}
                    >
                      <BlockComponent block={block} />
                    </DraggableBlock>
                  </BlockErrorBoundary>
                ))}
              </SortableContextAny>
            )}
          </div>

          <DragOverlayAny modifiers={[restrictToVerticalAxis]}>
            {activeBlock ? (
              <div className="bg-white shadow-2xl border-2 border-acacia opacity-80 scale-105 pointer-events-none w-[1200px] max-w-full origin-top">
                <BlockComponent block={activeBlock} />
              </div>
            ) : null}
          </DragOverlayAny>
        </DndContextAny>
      </div>
    </div>
  );
};
