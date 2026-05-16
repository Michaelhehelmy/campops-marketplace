import React, { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Save,
  RefreshCw,
  Search,
  Layout,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { toast } from "react-hot-toast";
import { usePages } from "@/hooks/queries/usePages";
import { MenuItem, Menu } from "@/types/api";
import axios from "axios";

// --- Components ---

interface SortableMenuItemProps {
  item: MenuItem;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<MenuItem>) => void;
  onAddChild: (id: string) => void;
  level?: number;
}

const SortableMenuItem: React.FC<SortableMenuItemProps> = ({
  item,
  onDelete,
  onUpdate,
  onAddChild,
  level = 0,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    marginLeft: `${level * 24}px`,
    zIndex: isDragging ? 100 : "auto",
    opacity: isDragging ? 0.5 : 1,
  };

  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div ref={setNodeRef} style={style} className="group mb-2">
      <div className="flex items-center gap-3 p-3 bg-white border border-stone-200 rounded-xl hover:border-oasis/30 hover:shadow-md transition-all">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-stone-300 hover:text-stone-500"
        >
          <GripVertical size={18} />
        </div>

        <div className="flex-1 flex items-center gap-4">
          <div className="flex-1">
            <Input
              value={item.label}
              onChange={(e) => onUpdate(item.id, { label: e.target.value })}
              className="h-8 border-none bg-transparent hover:bg-stone-50 focus:bg-white text-sm font-bold p-1"
              placeholder="Menu Label"
            />
          </div>
          <div className="flex-[1.5] flex items-center gap-2">
            <LinkIcon size={14} className="text-stone-300" />
            <Input
              value={item.path}
              onChange={(e) => onUpdate(item.id, { path: e.target.value })}
              className="h-8 border-none bg-transparent hover:bg-stone-50 focus:bg-white text-xs font-mono p-1"
              placeholder="/url-or-slug"
            />
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-stone-400 hover:text-oasis hover:bg-oasis/5"
            onClick={() => onAddChild(item.id)}
            title="Add Sub-item"
          >
            <Plus size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-stone-400 hover:text-red-500 hover:bg-red-50"
            onClick={() => onDelete(item.id)}
            title="Delete Item"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      {item.children && item.children.length > 0 && (
        <div className="mt-2 border-l-2 border-stone-100 pl-4">
          {item.children.map((child) => (
            <SortableMenuItem
              key={child.id}
              item={child}
              onDelete={onDelete}
              onUpdate={onUpdate}
              onAddChild={onAddChild}
              level={0} // Level is handled by nesting container margin
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- Main Page ---

export default function NavigationPage() {
  const [menu, setMenu] = useState<Menu | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { data: pagesData } = usePages();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchMenu();
  }, []);

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/menus/main");
      setMenu(res.data.data);
    } catch (error) {
      console.error("Failed to fetch menu:", error);
      toast.error("Failed to load navigation menu");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!menu) return;
    try {
      setIsSaving(true);
      await axios.put("/api/menus/main", { structure: menu.structure });

      // Invalidate the menu query cache so other components see the update
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.invalidateQueries({ queryKey: ["menu", "main"] });

      toast.success("Navigation menu saved successfully");
    } catch (error) {
      console.error("Failed to save menu:", error);
      toast.error("Failed to save menu");
    } finally {
      setIsSaving(false);
    }
  };

  const findItemAndExecute = (
    items: MenuItem[],
    id: string,
    action: (items: MenuItem[], index: number) => void
  ): boolean => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        action(items, i);
        return true;
      }
      if (items[i].children && findItemAndExecute(items[i].children!, id, action)) {
        return true;
      }
    }
    return false;
  };

  const handleUpdateItem = (id: string, updates: Partial<MenuItem>) => {
    if (!menu) return;
    const newStructure = [...menu.structure];
    findItemAndExecute(newStructure, id, (items, index) => {
      items[index] = { ...items[index], ...updates };
    });
    setMenu({ ...menu, structure: newStructure });
  };

  const handleDeleteItem = (id: string) => {
    if (!menu) return;
    const newStructure = [...menu.structure];
    findItemAndExecute(newStructure, id, (items, index) => {
      items.splice(index, 1);
    });
    setMenu({ ...menu, structure: newStructure });
  };

  const handleAddChild = (parentId: string) => {
    if (!menu) return;
    const newStructure = [...menu.structure];
    findItemAndExecute(newStructure, parentId, (items, index) => {
      if (!items[index].children) items[index].children = [];
      items[index].children!.push({
        id: crypto.randomUUID(),
        label: "Sub Item",
        path: "#",
      });
    });
    setMenu({ ...menu, structure: newStructure });
  };

  const handleAddTopLevel = () => {
    if (!menu) return;
    setMenu({
      ...menu,
      structure: [
        ...menu.structure,
        {
          id: crypto.randomUUID(),
          label: "New Menu Item",
          path: "/",
        },
      ],
    });
  };

  const handleAddPage = (page: any) => {
    if (!menu) return;
    setMenu({
      ...menu,
      structure: [
        ...menu.structure,
        {
          id: crypto.randomUUID(),
          label: page.title,
          path: `/page/${page.slug}`,
        },
      ],
    });
    toast.success(`Added "${page.title}" to menu`);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!menu || !over || active.id === over.id) return;

    // Simple top-level reordering for now
    // Complex nested reordering is harder with dnd-kit vertical strategy
    const oldIndex = menu.structure.findIndex((i) => i.id === active.id);
    const newIndex = menu.structure.findIndex((i) => i.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setMenu({
        ...menu,
        structure: arrayMove(menu.structure, oldIndex, newIndex),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <RefreshCw size={32} className="animate-spin text-stone-300" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center justify-between mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl font-black tracking-tighter text-stone-900">Menu Builder</h1>
          <p className="text-stone-500 font-medium italic">
            Configure your site's navigation structure
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={fetchMenu} className="rounded-xl border-stone-200">
            <RefreshCw size={18} className="mr-2" /> Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-oasis hover:bg-oasis-dark text-white px-8 shadow-lg shadow-oasis/20"
          >
            {isSaving ? (
              <RefreshCw size={18} className="mr-2 animate-spin" />
            ) : (
              <Save size={18} className="mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Menu Structure */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-stone-50/50 rounded-3xl p-8 border-2 border-dashed border-stone-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400">
                Main Navigation Structure
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddTopLevel}
                className="rounded-full h-8 text-[10px] uppercase tracking-widest font-bold border-oasis/30 text-oasis hover:bg-oasis hover:text-white"
              >
                <Plus size={14} className="mr-1" /> Add Top Level
              </Button>
            </div>

            {menu?.structure.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-stone-100 shadow-sm">
                <Layout size={48} className="mx-auto text-stone-200 mb-4" />
                <p className="text-stone-400 font-medium">
                  No menu items yet. Add your first item or pick from existing pages.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={menu?.structure.map((i) => i.id) || []}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {menu?.structure.map((item) => (
                      <SortableMenuItem
                        key={item.id}
                        item={item}
                        onDelete={handleDeleteItem}
                        onUpdate={handleUpdateItem}
                        onAddChild={handleAddChild}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Right Column: Available Pages & External Links */}
        <div className="lg:col-span-4 space-y-8">
          {/* Quick Add Pages */}
          <div className="bg-white rounded-3xl p-8 border border-stone-100 shadow-xl shadow-stone-200/50">
            <h3 className="text-sm font-bold uppercase tracking-widest text-stone-400 mb-6 flex items-center gap-2">
              <Layout size={16} /> Quick Add Pages
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(pagesData as any)?.data
                ?.filter((p: any) => p.status === "published")
                .map((page: any) => (
                  <button
                    key={page.id}
                    onClick={() => handleAddPage(page)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-stone-50 hover:border-oasis/30 hover:bg-oasis/5 transition-all text-left group"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-bold text-stone-700">{page.title}</p>
                      <p className="text-[10px] font-mono text-stone-400">/{page.slug}</p>
                    </div>
                    <Plus
                      size={16}
                      className="text-stone-300 group-hover:text-oasis transition-colors"
                    />
                  </button>
                ))}
              {!(pagesData as any)?.data?.length && (
                <p className="text-center py-8 text-xs text-stone-400 italic">
                  No published pages found
                </p>
              )}
            </div>
          </div>

          {/* External Links Info */}
          <div className="bg-oasis/5 rounded-3xl p-8 border border-oasis/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-oasis-dark mb-4 flex items-center gap-2">
              <ExternalLink size={16} /> Pro Tip
            </h3>
            <p className="text-xs text-oasis-dark/70 leading-relaxed">
              You can add external links by entering a full URL (e.g.{" "}
              <code>https://google.com</code>) in the path field. Internal paths should start with a
              slash (e.g. <code>/rooms</code>).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
