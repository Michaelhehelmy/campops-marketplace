import React, { useEffect, memo, useState, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { BubbleMenu, FloatingMenu } from "@tiptap/react/menus";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import FloatingMenuExtension from "@tiptap/extension-floating-menu";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/components/ui/Button";
import { Bold, Italic, Link as LinkIcon, Heading1, Heading2, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { LinkDialog, type LinkAttrs } from "./LinkDialog";

// Alias Tiptap components to bypass ReactNode type mismatch with @types/react
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const BubbleMenuAny = BubbleMenu as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FloatingMenuAny = FloatingMenu as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const EditorContentAny = EditorContent as any;

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  placeholder?: string;
}

export const RichTextEditor = memo(({ content, onChange, className }: RichTextEditorProps) => {
  const memoizedExtensions = React.useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: "text-acacia underline cursor-pointer",
          rel: null, // allow rel to be set per-link
        },
      }),
      BubbleMenuExtension,
      FloatingMenuExtension,
    ],
    []
  );

  const isInitialMount = React.useRef(true);
  const tiptapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Link dialog state ──────────────────────────────────────────────────────
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [currentLinkAttrs, setCurrentLinkAttrs] = useState<LinkAttrs>({
    href: "",
    target: undefined,
    rel: undefined,
    title: undefined,
  });

  const editor = useEditor({
    extensions: memoizedExtensions,
    content,
    editorProps: {
      attributes: {
        class: cn("prose prose-sm max-w-none focus:outline-none min-h-[20px]", className),
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const cleanHtml = html.replace(/<p><\/p>$/, "").trim();
      const cleanContent = content.replace(/<p><\/p>$/, "").trim();

      if (cleanHtml !== cleanContent && !isInitialMount.current) {
        if (tiptapTimer.current) clearTimeout(tiptapTimer.current);
        tiptapTimer.current = setTimeout(() => onChange(html), 100);
      }
      isInitialMount.current = false;
    },
  });

  // Sync content if changed externally (e.g. undo/redo)
  useEffect(() => {
    if (editor && !editor.isFocused && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false } as any);
    }
  }, [content, editor]);

  // ── Open link dialog, pre-populating from existing link attrs ──────────────
  const openLinkDialog = useCallback(() => {
    if (!editor) return;
    const attrs = editor.getAttributes("link") as {
      href?: string;
      target?: string;
      rel?: string;
      title?: string;
    };
    setCurrentLinkAttrs({
      href: attrs.href ?? "",
      target: attrs.target,
      rel: attrs.rel,
      title: attrs.title,
    });
    setLinkDialogOpen(true);
  }, [editor]);

  const handleLinkSave = useCallback(
    (attrs: LinkAttrs) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({
          href: attrs.href,
          target: attrs.target ?? null,
          rel: attrs.rel ?? null,
          title: attrs.title ?? null,
        } as any)
        .run();
      setLinkDialogOpen(false);
    },
    [editor]
  );

  const handleLinkRemove = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkDialogOpen(false);
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="relative group/editor">
      {editor && (
        <BubbleMenuAny
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex bg-white shadow-xl border border-stone-200 rounded-lg overflow-hidden p-1 gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("bold") && "bg-stone-100 text-acacia")}
            aria-label="Bold"
          >
            <Bold size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn("h-8 w-8 p-0", editor.isActive("italic") && "bg-stone-100 text-acacia")}
            aria-label="Italic"
          >
            <Italic size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openLinkDialog}
            data-testid="bubble-link-btn"
            className={cn("h-8 w-8 p-0", editor.isActive("link") && "bg-stone-100 text-acacia")}
            aria-label={editor.isActive("link") ? "Edit link" : "Insert link"}
            aria-pressed={editor.isActive("link")}
          >
            <LinkIcon size={14} />
          </Button>
          <div className="w-px h-4 bg-stone-200 self-center mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 1 }) && "bg-stone-100 text-acacia"
            )}
            aria-label="Heading 1"
          >
            <Heading1 size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "h-8 w-8 p-0",
              editor.isActive("heading", { level: 2 }) && "bg-stone-100 text-acacia"
            )}
            aria-label="Heading 2"
          >
            <Heading2 size={14} />
          </Button>
        </BubbleMenuAny>
      )}

      {editor && (
        <FloatingMenuAny
          editor={editor}
          tippyOptions={{ duration: 100 }}
          className="flex bg-white shadow-xl border border-stone-200 rounded-lg overflow-hidden p-1 gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className="h-8 px-2 flex items-center gap-2 text-xs"
          >
            <Heading1 size={14} /> Heading 1
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className="h-8 px-2 flex items-center gap-2 text-xs"
          >
            <List size={14} /> Bullet List
          </Button>
        </FloatingMenuAny>
      )}

      <div data-testid="richtext-editor">
        <EditorContentAny editor={editor} />
      </div>

      {/* Link dialog — rendered outside the editor so it's never clipped */}
      <LinkDialog
        open={linkDialogOpen}
        initialHref={currentLinkAttrs.href}
        initialTarget={currentLinkAttrs.target}
        initialRel={currentLinkAttrs.rel}
        initialTitle={currentLinkAttrs.title}
        onSave={handleLinkSave}
        onRemove={handleLinkRemove}
        onClose={() => setLinkDialogOpen(false)}
      />
    </div>
  );
});
