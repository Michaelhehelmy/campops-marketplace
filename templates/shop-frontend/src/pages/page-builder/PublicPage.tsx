/**
 * Public Page Renderer
 * Renders published pages for public access
 */

import { useParams, useLocation } from "react-router-dom";
import { usePublicPage } from "@/hooks/queries/usePages";
import { BlockRenderer } from "@/components/page-builder/BlockRenderer";
import { formatDate } from "@/lib/utils";

export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const location = useLocation();
  // Fallback: use pathname (strip leading slash) when no :slug param (e.g. /dining, /about)
  const resolvedSlug = slug || location.pathname.replace(/^\//, "");
  const { data: page, isLoading, error } = usePublicPage(resolvedSlug);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-muted-foreground">Page not found</p>
        </div>
      </div>
    );
  }

  // Set page title
  document.title = page.seo?.metaTitle || page.title;

  return (
    <article className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4">{page.title}</h1>
          {page.status === "published" && (
            <p className="text-sm text-muted-foreground">
              Last updated: {formatDate(page.updated_at)}
            </p>
          )}
        </header>

        <div className="space-y-8">
          {page.content?.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </article>
  );
}
