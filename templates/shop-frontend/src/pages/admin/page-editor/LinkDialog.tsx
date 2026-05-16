import React, { useState, useEffect, useCallback } from "react";
import { Link2, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { InternalLinkPicker } from "./InternalLinkPicker";

// Alias Radix/shadcn dialog components to bypass ReactNode mismatch
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogAny = Dialog as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogContentAny = DialogContent as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogHeaderAny = DialogHeader as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogTitleAny = DialogTitle as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DialogFooterAny = DialogFooter as any;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LinkAttrs {
  href: string;
  target?: string;
  rel?: string;
  title?: string;
}

export interface LinkDialogProps {
  open: boolean;
  initialHref?: string;
  initialTarget?: string;
  initialRel?: string;
  initialTitle?: string;
  onSave: (attrs: LinkAttrs) => void;
  onRemove: () => void;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseRel(rel?: string): { nofollow: boolean; sponsored: boolean; ugc: boolean } {
  const parts = (rel ?? "").split(/\s+/).filter(Boolean);
  return {
    nofollow: parts.includes("nofollow"),
    sponsored: parts.includes("sponsored"),
    ugc: parts.includes("ugc"),
  };
}

function buildRel(flags: { nofollow: boolean; sponsored: boolean; ugc: boolean }): string {
  const parts: string[] = [];
  if (flags.nofollow) parts.push("nofollow");
  if (flags.sponsored) parts.push("sponsored");
  if (flags.ugc) parts.push("ugc");
  return parts.join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LinkDialog({
  open,
  initialHref = "",
  initialTarget = "",
  initialRel = "",
  initialTitle = "",
  onSave,
  onRemove,
  onClose,
}: LinkDialogProps) {
  const [href, setHref] = useState(initialHref);
  const [openInNewTab, setOpenInNewTab] = useState(initialTarget === "_blank");
  const [title, setTitle] = useState(initialTitle);
  const [relFlags, setRelFlags] = useState(() => parseRel(initialRel));
  const [hrefError, setHrefError] = useState("");
  const [activeTab, setActiveTab] = useState<"external" | "internal">("external");

  // Sync state whenever the dialog re-opens with new initial values
  useEffect(() => {
    if (open) {
      setHref(initialHref);
      setOpenInNewTab(initialTarget === "_blank");
      setTitle(initialTitle);
      setRelFlags(parseRel(initialRel));
      setHrefError("");
      // Detect if current link is internal (starts with /)
      setActiveTab(initialHref.startsWith("/") ? "internal" : "external");
    }
  }, [open, initialHref, initialTarget, initialRel, initialTitle]);

  const handleRelFlag = (flag: keyof typeof relFlags) => {
    setRelFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const validate = useCallback((): boolean => {
    const trimmed = href.trim();
    if (!trimmed) {
      setHrefError("URL is required");
      return false;
    }
    // Must be a valid absolute URL or relative path
    const isRelative = trimmed.startsWith("/") || trimmed.startsWith("#");
    const isAbsolute =
      /^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed);
    if (!isRelative && !isAbsolute) {
      setHrefError("Enter a valid URL (e.g. https://example.com or /page/about)");
      return false;
    }
    setHrefError("");
    return true;
  }, [href]);

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      href: href.trim(),
      target: openInNewTab ? "_blank" : undefined,
      rel: buildRel(relFlags) || undefined,
      title: title.trim() || undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const isEditing = !!initialHref;

  return (
    <DialogAny open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContentAny className="sm:max-w-md" onKeyDown={handleKeyDown} aria-label="Link editor">
        <DialogHeaderAny>
          <DialogTitleAny className="flex items-center gap-2">
            <Link2 size={16} />
            {isEditing ? "Edit Link" : "Insert Link"}
          </DialogTitleAny>
        </DialogHeaderAny>

        {/* Tab switcher: External / Internal */}
        <div
          className="flex rounded-lg bg-stone-100 p-1 gap-1 mb-1"
          role="tablist"
          aria-label="Link type"
        >
          <button
            role="tab"
            aria-selected={activeTab === "external"}
            data-testid="tab-external"
            className={cn(
              "flex-1 text-sm py-1.5 rounded-md font-medium transition-colors",
              activeTab === "external"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("external")}
          >
            External URL
          </button>
          <button
            role="tab"
            aria-selected={activeTab === "internal"}
            data-testid="tab-internal"
            className={cn(
              "flex-1 text-sm py-1.5 rounded-md font-medium transition-colors",
              activeTab === "internal"
                ? "bg-white shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveTab("internal")}
          >
            Internal Page
          </button>
        </div>

        <div className="space-y-4 py-1">
          {/* URL field — always visible */}
          <div className="space-y-1.5">
            <Label htmlFor="link-href">
              {activeTab === "internal" ? "Selected page path" : "URL"}
            </Label>
            <div className="relative">
              <Input
                id="link-href"
                data-testid="link-href-input"
                placeholder={activeTab === "internal" ? "/page/about" : "https://example.com"}
                value={href}
                onChange={(e) => {
                  setHref(e.target.value);
                  if (hrefError) setHrefError("");
                }}
                readOnly={activeTab === "internal"}
                className={cn(
                  activeTab === "internal" && "bg-stone-50 text-muted-foreground cursor-default",
                  hrefError && "border-destructive focus-visible:ring-destructive"
                )}
                aria-describedby={hrefError ? "link-href-error" : undefined}
                aria-invalid={!!hrefError}
              />
              {href && activeTab === "external" && (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label="Preview link"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
            {hrefError && (
              <p id="link-href-error" className="text-xs text-destructive" role="alert">
                {hrefError}
              </p>
            )}
          </div>

          {/* Internal page picker */}
          {activeTab === "internal" && (
            <InternalLinkPicker
              selectedUrl={href}
              onSelect={(url: string) => {
                setHref(url);
                setHrefError("");
              }}
            />
          )}

          {/* Open in new tab */}
          <div className="flex items-center justify-between rounded-lg border border-stone-200 px-3 py-2.5">
            <Label className="cursor-pointer text-sm font-normal">Open in new tab</Label>
            <Switch
              data-testid="link-new-tab-switch"
              checked={openInNewTab}
              onCheckedChange={setOpenInNewTab}
              aria-label="Open in new tab"
            />
          </div>

          {/* Link title */}
          <div className="space-y-1.5">
            <Label htmlFor="link-title" className="flex items-center gap-1">
              Link title
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="link-title"
              data-testid="link-title-input"
              placeholder="Tooltip text shown on hover"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* SEO rel attributes */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Rel attributes
              <span className="text-muted-foreground font-normal">(SEO)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { key: "nofollow", label: "nofollow", desc: "Don't pass PageRank" },
                  { key: "sponsored", label: "sponsored", desc: "Paid/affiliate link" },
                  { key: "ugc", label: "ugc", desc: "User-generated content" },
                ] as const
              ).map(({ key, label, desc }) => (
                <button
                  key={key}
                  type="button"
                  data-testid={`rel-${key}`}
                  onClick={() => handleRelFlag(key)}
                  title={desc}
                  aria-pressed={relFlags[key]}
                  className={cn(
                    "px-2.5 py-1 text-xs rounded-full border font-mono transition-colors",
                    relFlags[key]
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-white text-stone-600 border-stone-300 hover:border-stone-400"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooterAny className="gap-2 sm:gap-0">
          {isEditing && (
            <Button
              variant="ghost"
              size="sm"
              data-testid="link-remove-btn"
              onClick={onRemove}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 mr-auto"
            >
              <Trash2 size={14} className="mr-1.5" />
              Remove link
            </Button>
          )}
          <Button variant="outline" size="sm" data-testid="link-cancel-btn" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" data-testid="link-save-btn" onClick={handleSave}>
            {isEditing ? "Update link" : "Insert link"}
          </Button>
        </DialogFooterAny>
      </DialogContentAny>
    </DialogAny>
  );
}
