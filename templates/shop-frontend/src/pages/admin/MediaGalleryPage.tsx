import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, del, api } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MediaItem, PaginatedResponse } from "@/types/api";
import { Image, Upload, Trash2 } from "lucide-react";
import { useRef } from "react";
import toast from "react-hot-toast";

export default function MediaGalleryPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.media,
    queryFn: () => get<PaginatedResponse<MediaItem>>("/media"),
    staleTime: 1000 * 60,
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      return api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.media });
      toast.success("Upload complete");
    },
    onError: () => toast.error("Upload failed"),
  });

  const deleteMedia = useMutation({
    mutationFn: (id: string) => del(`/media/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.media });
      toast.success("Deleted");
    },
  });

  const items = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="media-gallery-heading">
          Media
        </h1>
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => e.target.files && uploadMutation.mutate(e.target.files)}
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploadMutation.isPending}
            data-testid="upload-media-button"
          >
            <Upload size={18} className="mr-2" /> Upload
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card data-testid="media-empty">
          <CardContent className="py-12 text-center">
            <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No media files uploaded.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          data-testid="media-grid"
        >
          {items.map((item) => (
            <div key={item.id} className="group relative rounded-lg border overflow-hidden bg-card">
              {item.type === "image" ? (
                <img
                  src={item.url}
                  alt={item.alt_text || item.filename}
                  className="w-full aspect-square object-cover"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center bg-muted">
                  <span className="text-xs text-muted-foreground">Video</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="flex-1">
                  <p className="text-white text-xs truncate">{item.filename}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge
                      variant={item.is_public ? "success" : "secondary"}
                      className="text-[10px]"
                    >
                      {item.is_public ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:text-red-400"
                  data-testid={`delete-media-${item.id}`}
                  onClick={() => {
                    if (confirm("Delete?")) deleteMedia.mutate(item.id);
                  }}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
