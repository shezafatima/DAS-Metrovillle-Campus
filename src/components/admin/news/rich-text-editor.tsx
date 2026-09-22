"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { newsCopy } from "@/content/admin";

/**
 * The admin body editor (research.md §1, FR-002). StarterKit is
 * configured down to exactly the spec's formatting set — everything
 * else (code, blockquote, strike, underline, horizontal rule) is
 * disabled here as the first line of defence; the server sanitiser
 * (src/lib/news/sanitize.ts) is the authoritative control.
 */

const toolbarCopy = newsCopy.editor.toolbar;

interface ToolbarButtonProps {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}

function ToolbarButton({ active, label, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      data-active={active || undefined}
      onClick={onClick}
      className={cn(active && "bg-muted text-foreground")}
    >
      {children}
    </Button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex flex-wrap items-center gap-0.5 border-b border-input px-1.5 py-1"
    >
      <ToolbarButton
        active={editor.isActive("heading", { level: 2 })}
        label={toolbarCopy.heading2}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("heading", { level: 3 })}
        label={toolbarCopy.heading3}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bold")}
        label={toolbarCopy.bold}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("italic")}
        label={toolbarCopy.italic}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("bulletList")}
        label={toolbarCopy.bulletList}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("orderedList")}
        label={toolbarCopy.orderedList}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive("link")}
        label={toolbarCopy.link}
        onClick={() => {
          if (editor.isActive("link")) {
            editor.chain().focus().unsetLink().run();
            return;
          }
          const url = window.prompt(toolbarCopy.linkPrompt);
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
      >
        <Link2 />
      </ToolbarButton>
    </div>
  );
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  dir: "ltr" | "rtl";
  className?: string;
}

export function RichTextEditor({ value, onChange, dir, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        blockquote: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto"],
        },
      }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        dir,
        class: cn(
          "prose-news min-h-40 px-3 py-2 font-body text-body text-text outline-none",
          dir === "rtl" && "font-body-urdu",
        ),
        "aria-label": newsCopy.editor.fields.body,
      },
    },
    onUpdate: ({ editor: current }) => onChange(current.getHTML()),
  });

  // Keep the editor's own direction attribute in sync when the admin
  // switches the post's language after the editor has already mounted
  // (T060 — language select drives dir without remounting the editor).
  useEffect(() => {
    if (!editor) return;
    editor.setOptions({
      editorProps: {
        attributes: {
          dir,
          class: cn(
            "prose-news min-h-40 px-3 py-2 font-body text-body text-text outline-none",
            dir === "rtl" && "font-body-urdu",
          ),
          "aria-label": newsCopy.editor.fields.body,
        },
      },
    });
  }, [editor, dir]);

  if (!editor) return null;

  return (
    <div className={cn("overflow-hidden rounded-md border border-input bg-background shadow-xs", className)}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}
