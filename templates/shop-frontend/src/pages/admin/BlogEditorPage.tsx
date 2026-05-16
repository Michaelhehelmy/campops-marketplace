import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { get, post, del } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BlogPost, PaginatedResponse } from "@/types/api";
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import toast from "react-hot-toast";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function BlogEditorPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.blogPosts,
    queryFn: () => get<PaginatedResponse<BlogPost>>("/blog_posts"),
    staleTime: 1000 * 30,
  });

  const createPost = useMutation({
    mutationFn: (formData: FormData) => {
      const body = Object.fromEntries(formData);
      return post("/blog_posts", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.blogPosts });
      toast.success("Post published successfully");
      setShowForm(false);
    },
    onError: () => toast.error("Failed to create post"),
  });

  const deletePost = useMutation({
    mutationFn: (id: string) => del(`/blog_posts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.blogPosts });
      toast.success("Post deleted");
    },
  });

  const posts = data?.data ?? [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold" data-testid="blog-editor-heading">
          Blog
        </h1>
        <Button onClick={() => setShowForm(!showForm)} data-testid="new-post-btn">
          <Plus size={18} className="mr-2" /> New Post
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createPost.mutate(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" name="title" required data-testid="post-title-input" />
                </div>
                <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" placeholder="auto-generated-slug" />
                </div>
              </div>
              <div>
                <Label htmlFor="excerpt">Excerpt</Label>
                <Input id="excerpt" name="excerpt" />
              </div>
              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  name="content"
                  rows={8}
                  required
                  data-testid="post-content-input"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="featured_image">Featured Image URL</Label>
                  <Input id="featured_image" name="featured_image" type="url" />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <select
                    name="status"
                    id="status"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={createPost.isPending} data-testid="save-post-btn">
                  Create Post
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Card data-testid="blog-empty">
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No blog posts yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" data-testid="blog-posts-list">
          {posts.map((p) => (
            <Card key={p.id}>
              <CardContent className="py-4 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold">{p.title}</h3>
                    <Badge variant={p.status === "published" ? "success" : "secondary"}>
                      {p.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    /{p.slug} · {format(new Date(p.updated_at), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon">
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    data-testid="delete-blog-btn"
                    onClick={() => setDeleteConfirmId(p.id)}
                  >
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        onConfirm={() => {
          if (deleteConfirmId) deletePost.mutate(deleteConfirmId);
        }}
        title="Delete Blog Post"
        description="Are you sure you want to delete this blog post?"
      />
    </div>
  );
}
