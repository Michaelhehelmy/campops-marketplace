import React, { useState, useMemo } from "react";
import { Search, FileText, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { usePages } from "@/hooks/queries/usePages";
import { cn } from "@/lib/utils";
import type { CustomPage } from "@/types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InternalLinkPickerProps {
  selectedUrl: string;
  onSelect: (url: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function InternalLinkPicker({ selectedUrl, onSelect }: InternalLinkPickerProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = usePages({
    status: "published",
    limit: 100,
  });

  const pages: CustomPage[] = useMemo(() => {
    if (!data?.data) return [];
    return data.data;
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (p) => p.title.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [pages, search]);

  return (
    <div className="space-y-2" data-testid="internal-link-picker">
      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          data-testid="internal-search-input"
          placeholder="Search pages by title or slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 text-sm"
          aria-label="Search published pages"
        />
      </div>

      {/* List */}
      <div
        className="max-h-48 overflow-y-auto rounded-md border border-stone-200 bg-white"
        role="listbox"
        aria-label="Published pages"
        aria-busy={isLoading}
      >
        {isLoading && (
          <div
            className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"
            data-testid="picker-loading"
          >
            <Loader2 size={14} className="animate-spin" />
            Loading pages…
          </div>
        )}

        {isError && (
          <div
            className="flex items-center gap-2 px-3 py-4 text-sm text-destructive"
            data-testid="picker-error"
          >
            <AlertCircle size={14} />
            Failed to load pages. Please try again.
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div
            className="px-3 py-4 text-sm text-muted-foreground text-center"
            data-testid="picker-empty"
          >
            {pages.length === 0 ? "No published pages yet." : "No pages match your search."}
          </div>
        )}

        {!isLoading &&
          !isError &&
          filtered.map((page) => {
            const url = `/page/${page.slug}`;
            const isSelected = selectedUrl === url;
            return (
              <button
                key={page.id}
                role="option"
                aria-selected={isSelected}
                data-testid={`page-option-${page.slug}`}
                onClick={() => onSelect(url)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-stone-50 transition-colors border-b border-stone-100 last:border-0",
                  isSelected && "bg-primary/5 text-primary"
                )}
              >
                {isSelected ? (
                  <CheckCircle2 size={14} className="shrink-0 text-primary" />
                ) : (
                  <FileText size={14} className="shrink-0 text-muted-foreground" />
                )}
                <span className="flex-1 min-w-0">
                  <span className="block truncate font-medium">{page.title}</span>
                  <span className="block truncate text-xs text-muted-foreground font-mono">
                    {url}
                  </span>
                </span>
              </button>
            );
          })}
      </div>
    </div>
  );
}
