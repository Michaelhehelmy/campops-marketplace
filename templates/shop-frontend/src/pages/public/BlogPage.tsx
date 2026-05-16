import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { queryKeys } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import type { BlogPost, PaginatedResponse } from "@/types/api";
import { format } from "date-fns";
import { Link } from "react-router-dom";

export default function BlogPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.blogPosts,
    queryFn: () => get<PaginatedResponse<BlogPost>>("/public/blog_posts?status=published"),
    staleTime: 1000 * 60 * 5,
  });

  const posts = data?.data ?? [];

  return (
    <div className="container mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-bold mb-2">Blog</h1>
      <p className="text-muted-foreground mb-8">Stories, tips, and updates from our camp.</p>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">
          No blog posts yet. Check back soon!
        </p>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {post.featured_image && (
                  <img
                    src={post.featured_image}
                    alt={post.title}
                    className="sm:w-48 h-48 object-cover"
                  />
                )}
                <div className="flex-1">
                  <CardHeader>
                    <CardTitle className="text-xl">
                      <Link
                        to={`/page/${post.slug}`}
                        className="hover:text-primary transition-colors"
                      >
                        {post.title}
                      </Link>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {post.excerpt && (
                      <p className="text-muted-foreground text-sm mb-3">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {post.author_name && <span>By {post.author_name}</span>}
                      <span>{format(new Date(post.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
