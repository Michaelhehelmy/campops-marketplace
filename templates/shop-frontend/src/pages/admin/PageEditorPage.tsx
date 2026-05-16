import React, { useState, useEffect, lazy, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePage, useCreatePage, useUpdatePage, usePublishPage } from "@/hooks/queries/usePages";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, PanelRight, Settings, Image as ImageIcon, CheckCircle, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/Button";
import toast from "react-hot-toast";
import type { CustomPage } from "@/types/api";
import { useCanvasStore } from "@/store/canvasStore";
import { usePageSync } from "@/hooks/usePageSync";
import { ConflictResolutionModal } from "@/components/ConflictResolutionModal";

// Alias Radix/shadcn dialog components to bypass ReactNode mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogAny = Dialog as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogContentAny = DialogContent as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SheetAny = Sheet as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SheetContentAny = SheetContent as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SheetHeaderAny = SheetHeader as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SheetTitleAny = SheetTitle as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogHeaderAny = DialogHeader as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogTitleAny = DialogTitle as any;

// Lazy load sub-components
const EditorToolbar = lazy(() =>
  import("./page-editor/EditorToolbar").then((m) => ({ default: m.EditorToolbar }))
);
const BlockPalette = lazy(() =>
  import("./page-editor/BlockPalette").then((m) => ({ default: m.BlockPalette }))
);
const EditorCanvas = lazy(() =>
  import("./page-editor/EditorCanvas").then((m) => ({ default: m.EditorCanvas }))
);
const PropertiesPanel = lazy(() =>
  import("./page-editor/PropertiesPanel").then((m) => ({ default: m.PropertiesPanel }))
);

export default function PageEditorPage() {
  const { id, systemSlug } = useParams<{ id: string; systemSlug: string }>();
  const navigate = useNavigate();
  const {
    setPageData,
    setTitle,
    setSlug,
    setStatus,
    isDirty,
    blocks,
    title,
    slug,
    status,
    seo,
    reset,
  } = useCanvasStore();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mediaLibrary] = useState<any[]>([]);

  // If we have a systemSlug but no id, use slug:prefix for fetching
  const fetchId = id || (systemSlug ? `slug:${systemSlug === "home" ? "" : systemSlug}` : "");

  const { data: page, isLoading } = usePage(fetchId);
  const createMutation = useCreatePage();
  const updateMutation = useUpdatePage();
  const publishMutation = usePublishPage();

  // Offline sync support
  const { hasConflict, resolveConflict, isLocalOnly } = usePageSync({
    pageId: fetchId || "new",
    onSave: async (data) => {
      if (fetchId && id !== "new") {
        await updateMutation.mutateAsync({ id: fetchId, data });
      } else {
        const newPage = await createMutation.mutateAsync(data);
        navigate(`/admin/pages/${newPage.id}`, { replace: true });
      }
    },
  });

  // Initialize store with page data
  useEffect(() => {
    if (page) {
      setPageData(page);
      // Clear history to avoid "undo to blank"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useCanvasStore as any).temporal.getState().clear();
    } else if (id === "new") {
      reset();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useCanvasStore as any).temporal.getState().clear();
    } else if (systemSlug && !isLoading && !page) {
      // Initialize system page defaults if not found in DB
      const defaultTitle =
        systemSlug === "home"
          ? "Home"
          : systemSlug
              .split("-")
              .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
              .join(" ");
      setTitle(defaultTitle);
      setSlug(systemSlug === "home" ? "" : systemSlug);
      setStatus("published");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (useCanvasStore as any).temporal.getState().clear();
    }
  }, [page, id, systemSlug, isLoading, setPageData, reset, setTitle, setSlug, setStatus]);

  const handleSave = async () => {
    // CustomPage uses `content` for blocks — map our store `blocks` to `content`
    const pageData = {
      title,
      slug,
      status,
      content: blocks as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      seo,
    } as Partial<CustomPage>;

    try {
      if (fetchId && id !== "new") {
        const updatedPage = await updateMutation.mutateAsync({ id: fetchId, data: pageData });
        setPageData(updatedPage);
        toast.success("Page saved successfully");
      } else {
        const newPage = await createMutation.mutateAsync(pageData);
        setPageData(newPage);
        toast.success("Page created successfully");
        navigate(`/admin/pages/${newPage.id}`, { replace: true });
      }
    } catch (error: any) {
      if (error?.response?.status === 409) {
        // Conflict - will be handled by usePageSync
        return;
      }
      if (error?.response?.status === 404 && systemSlug) {
        // If system page not found, try creating it
        try {
          const newPage = await createMutation.mutateAsync(pageData);
          setPageData(newPage);
          toast.success("Page created successfully");
          navigate(`/admin/pages/${newPage.id}`, { replace: true });
          return;
        } catch {
          toast.error("Failed to create system page");
        }
      }
      toast.error("Failed to save page");
    }
  };

  const handlePublish = async () => {
    if (isDirty) await handleSave();
    try {
      if (fetchId) {
        await publishMutation.mutateAsync(fetchId);
        toast.success("Page published successfully");
      }
    } catch {
      toast.error("Failed to publish page");
    }
  };

  const handleImageUpload = (_e: React.ChangeEvent<HTMLInputElement>) => {
    toast.success("Image uploaded (simulated)");
  };

  const handleImageSelect = (_url: string) => {
    setMediaPickerOpen(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (useCanvasStore as any).temporal.getState().redo();
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (useCanvasStore as any).temporal.getState().undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (useCanvasStore as any).temporal.getState().redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acacia" />
      </div>
    );
  }

  return (
    <div
      className="md:h-[calc(100vh-160px)] h-screen bg-white flex flex-col overflow-hidden relative"
      data-testid="page-editor-container"
    >
      <Suspense fallback={<div className="h-16 border-b bg-stone-50 animate-pulse" />}>
        <EditorToolbar
          onSave={handleSave}
          onPublish={handlePublish}
          isSaving={updateMutation.isPending || createMutation.isPending}
          isPublishing={publishMutation.isPending}
          isLocalOnly={isLocalOnly}
        />
      </Suspense>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Desktop Palette */}
        <div className="hidden md:block w-64 shrink-0 overflow-hidden">
          <Suspense fallback={<div className="w-64 border-r bg-stone-50 animate-pulse" />}>
            <BlockPalette />
          </Suspense>
        </div>

        {/* Mobile Palette Drawer */}
        <SheetAny open={paletteOpen} onOpenChange={setPaletteOpen}>
          <SheetContentAny side="left" className="p-0 w-72">
            <SheetHeaderAny className="p-4 border-b">
              <SheetTitleAny>Add Blocks</SheetTitleAny>
            </SheetHeaderAny>
            <Suspense fallback={<div className="flex-1 bg-stone-50 animate-pulse" />}>
              <BlockPalette />
            </Suspense>
          </SheetContentAny>
        </SheetAny>

        <Suspense fallback={<div className="flex-1 bg-stone-100 animate-pulse" />}>
          <EditorCanvas />
        </Suspense>

        {/* Desktop Properties */}
        <div className="hidden md:block w-80 shrink-0 overflow-hidden">
          <Suspense fallback={<div className="w-80 border-l bg-stone-50 animate-pulse" />}>
            <PropertiesPanel />
          </Suspense>
        </div>

        {/* Mobile Properties Drawer */}
        <SheetAny open={propertiesOpen} onOpenChange={setPropertiesOpen}>
          <SheetContentAny side="right" className="p-0 w-80">
            <SheetHeaderAny className="p-4 border-b">
              <SheetTitleAny>Properties</SheetTitleAny>
            </SheetHeaderAny>
            <Suspense fallback={<div className="flex-1 bg-stone-50 animate-pulse" />}>
              <PropertiesPanel />
            </Suspense>
          </SheetContentAny>
        </SheetAny>

        {/* Mobile FABs */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex gap-4 z-40">
          <Button
            variant="default"
            size="lg"
            className="rounded-full shadow-xl bg-acacia hover:bg-acacia/90 h-14 w-14"
            onClick={() => setPaletteOpen(true)}
            data-testid="mobile-palette-trigger"
          >
            <Plus className="h-6 w-6" />
          </Button>
          <Button
            variant="default"
            size="lg"
            className="rounded-full shadow-xl bg-charcoal hover:bg-charcoal/90 h-14 w-14"
            onClick={() => setPropertiesOpen(true)}
            data-testid="mobile-properties-trigger"
          >
            <Settings className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Media Picker Dialog */}
      <DialogAny open={mediaPickerOpen} onOpenChange={setMediaPickerOpen}>
        <DialogContentAny className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeaderAny>
            <DialogTitleAny>Media Library</DialogTitleAny>
          </DialogHeaderAny>
          <div className="space-y-6">
            <div className="border-2 border-dashed border-stone-200 rounded-lg p-6">
              <div className="text-center">
                <Upload className="h-10 w-10 mx-auto text-stone-400 mb-3" />
                <p className="text-sm text-stone-600 mb-3">Upload a new image</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                  data-testid="image-upload-input"
                />
                <label htmlFor="image-upload">
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            </div>

            {mediaLibrary.length > 0 ? (
              <div>
                <h3 className="font-semibold mb-3">Your Images</h3>
                <div className="grid grid-cols-4 gap-4">
                  {mediaLibrary.map((image) => (
                    <div
                      key={image.id}
                      className="group relative aspect-square rounded-lg overflow-hidden border border-stone-200 cursor-pointer hover:ring-2 hover:ring-acacia transition-all"
                      onClick={() => handleImageSelect(image.url)}
                      data-testid={`media-image-${image.id}`}
                    >
                      <img
                        src={image.url}
                        alt={image.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <CheckCircle className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-stone-500">
                <ImageIcon className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p>No images in your library yet</p>
              </div>
            )}
          </div>
        </DialogContentAny>
      </DialogAny>

      <ConflictResolutionModal
        open={hasConflict}
        onClose={() => {}}
        onReload={() => resolveConflict("reload")}
        onKeepEditing={() => resolveConflict("keep")}
      />
    </div>
  );
}
