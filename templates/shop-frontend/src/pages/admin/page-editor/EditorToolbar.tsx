import React, { FC, ChangeEvent, useEffect } from "react";
import { useStore } from "zustand";
import { Button } from "@/components/ui/Button";
import {
  Save,
  Eye,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle,
  ChevronLeft,
  Download,
  Upload,
  MoreVertical,
} from "lucide-react";
import { useCanvasStore } from "@/store/canvasStore";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/Badge";
import { WifiOff } from "lucide-react";

// Alias Radix/shadcn dropdown components to bypass ReactNode mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DropdownMenuAny = DropdownMenu as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DropdownMenuTriggerAny = DropdownMenuTrigger as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DropdownMenuContentAny = DropdownMenuContent as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DropdownMenuItemAny = DropdownMenuItem as any;

interface EditorToolbarProps {
  onSave: () => void;
  onPublish: () => void;
  isSaving: boolean;
  isPublishing: boolean;
  isLocalOnly?: boolean;
}

export const EditorToolbar: FC<EditorToolbarProps> = ({
  onSave,
  onPublish,
  isSaving,
  isPublishing,
  isLocalOnly,
}) => {
  const navigate = useNavigate();
  const {
    title,
    setTitle,
    slug,
    setSlug,
    status,
    isDirty,
    zoom,
    setZoom,
    setPan,
    blocks,
    seo,
    previewDevice,
    setPreviewDevice,
    setPageData,
  } = useCanvasStore();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { undo, redo, pastStates, futureStates } = useStore((useCanvasStore as any).temporal);

  const handleExport = () => {
    const data = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      page: { title, slug, status, blocks, seo },
      history: pastStates,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `page-backup-${slug || "new"}-${new Date().getTime()}.json`;
    link.click();
    toast.success("Backup downloaded successfully");
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.page) {
          setPageData(data.page);
          toast.success("Backup imported successfully");
        }
      } catch (error) {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
  };

  const zoomIn = () => setZoom(Math.min(zoom + 0.1, 2));
  const zoomOut = () => setZoom(Math.max(zoom - 0.1, 0.5));
  const resetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="md:h-16 h-auto border-b bg-white flex flex-col md:flex-row items-center justify-between px-4 py-2 md:py-0 z-30 shadow-sm gap-4">
      <div className="flex items-center gap-2 md:gap-4 flex-1 w-full md:w-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/admin/pages")}
          aria-label="Back to pages"
          title="Back to pages"
          className="md:flex hidden"
        >
          <ChevronLeft size={20} />
        </Button>
        <div className="flex flex-col flex-1 min-w-0">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-sm font-bold bg-transparent border-none focus:ring-0 p-0 w-full md:w-48 truncate"
            placeholder="Page Title"
            data-testid="page-title-input"
            aria-label="Page Title"
          />
          <div className="flex items-center text-[10px] text-stone-400 font-mono">
            <span className="md:inline hidden">/</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="bg-transparent border-none focus:ring-0 p-0 ml-0.5 w-full md:w-40 truncate"
              placeholder="page-slug"
              data-testid="page-slug-input"
              aria-label="Page Slug"
            />
          </div>
          {isLocalOnly && (
            <Badge
              variant="warning"
              className="w-fit gap-1 animate-pulse"
              data-testid="local-draft-indicator"
            >
              <WifiOff size={10} />
              Local Draft
            </Badge>
          )}
        </div>
      </div>

      {/* Middle: Canvas Controls - Hidden on very small screens or smaller */}
      <div className="hidden sm:flex items-center bg-stone-50 rounded-full px-2 py-1 gap-1 border border-stone-100 h-12 md:h-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 rounded-full min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0"
          onClick={() => undo()}
          disabled={pastStates.length === 0}
          data-testid="undo-btn"
          aria-label="Undo"
          title="Undo"
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 rounded-full min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0"
          onClick={() => redo()}
          disabled={futureStates.length === 0}
          data-testid="redo-btn"
          aria-label="Redo"
          title="Redo"
        >
          <RotateCw size={16} />
        </Button>
        <div className="w-px h-4 bg-stone-200 mx-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 rounded-full min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0"
          onClick={zoomOut}
          data-testid="zoom-out-btn"
          aria-label="Zoom Out"
        >
          <ZoomOut size={16} />
        </Button>
        <button
          className="text-[10px] font-bold w-12 h-10 md:w-10 md:h-8 min-h-[48px] md:min-h-0 hover:bg-stone-200 rounded py-1 transition-colors flex items-center justify-center"
          onClick={resetZoom}
          aria-label={`Current zoom: ${Math.round(zoom * 100)}%`}
          data-testid="zoom-reset"
        >
          {Math.round(zoom * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 md:h-8 md:w-8 rounded-full min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0"
          onClick={zoomIn}
          data-testid="zoom-in-btn"
          aria-label="Zoom In"
        >
          <ZoomIn size={16} />
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 md:gap-4 w-full md:w-auto">
        {/* Device Toggle */}
        <div className="flex bg-stone-100 p-1 rounded-lg">
          {(["mobile", "tablet", "desktop"] as const).map((d) => (
            <Button
              key={d}
              variant={previewDevice === d ? "default" : "ghost"}
              size="icon"
              className="h-12 w-12 md:h-8 md:w-8 rounded-md min-h-[48px] min-w-[48px] md:min-h-0 md:min-w-0"
              onClick={() => setPreviewDevice(d)}
              data-testid={`device-toggle-${d}`}
              aria-label={`Preview on ${d}`}
            >
              {d === "mobile" && <Smartphone size={16} />}
              {d === "tablet" && <Tablet size={16} />}
              {d === "desktop" && <Monitor size={16} />}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Main Actions */}
          <Button
            onClick={onSave}
            disabled={isSaving}
            size="sm"
            className="md:h-9 h-11 px-3 md:px-4 bg-stone-800 hover:bg-stone-700 text-white text-xs md:text-sm"
            data-testid="save-btn"
          >
            <Save size={16} className="md:mr-2" />{" "}
            <span className="hidden sm:inline">{isDirty ? "Save Changes" : "Saved"}</span>
          </Button>

          <Button
            onClick={onPublish}
            disabled={isPublishing || status === "published"}
            size="sm"
            variant={status === "published" ? "secondary" : "default"}
            className={`md:h-9 h-11 px-3 md:px-4 text-xs md:text-sm ${status !== "published" ? "bg-oasis hover:bg-oasis-dark text-white" : ""}`}
            data-testid="publish-btn"
          >
            <CheckCircle size={16} className="md:mr-2" />{" "}
            <span className="hidden sm:inline">
              {status === "published" ? "Published" : "Publish"}
            </span>
          </Button>

          {/* Overflow Menu */}
          <DropdownMenuAny>
            <DropdownMenuTriggerAny asChild>
              <Button
                variant="outline"
                size="icon"
                className="md:h-9 h-11 w-10 md:w-10 rounded-full"
                data-testid="toolbar-overflow"
              >
                <MoreVertical size={18} />
              </Button>
            </DropdownMenuTriggerAny>
            <DropdownMenuContentAny align="end" className="w-48">
              <DropdownMenuItemAny onClick={() => window.open(`/page/${slug}`, "_blank")}>
                <Eye size={16} className="mr-2" /> Preview Page
              </DropdownMenuItemAny>
              <DropdownMenuItemAny onClick={handleExport} data-testid="export-btn">
                <Download size={16} className="mr-2" /> Backup (JSON)
              </DropdownMenuItemAny>
              <DropdownMenuItemAny className="relative" data-testid="restore-btn">
                <Upload size={16} className="mr-2" /> Restore
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </DropdownMenuItemAny>
              <DropdownMenuItemAny onClick={() => navigate("/admin/pages")} className="md:hidden">
                <ChevronLeft size={16} className="mr-2" /> Back to Pages
              </DropdownMenuItemAny>
            </DropdownMenuContentAny>
          </DropdownMenuAny>
        </div>
      </div>
    </div>
  );
};
