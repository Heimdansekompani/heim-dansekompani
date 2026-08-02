"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";

import { RichTextToolbar } from "@/components/admin/rich-text-toolbar";
import { ButtonLink } from "@/lib/tiptap-button-link";
import { FontSize } from "@/lib/tiptap-font-size";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  content: JSONContent | undefined;
  onChange: (content: JSONContent) => void;
  className?: string;
}

export function RichTextEditor({
  content,
  onChange,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        strike: false,
        // Replaced by ButtonLink (same mark, plus the button variant).
        link: false,
      }),
      ButtonLink.configure({
        openOnClick: false,
        autolink: true,
      }),
      TextStyle,
      Color,
      FontSize,
      TextAlign.configure({ types: ["paragraph"] }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class:
          "min-h-32 font-serif text-base leading-relaxed text-white/80 focus:outline-none [&_a:not([data-variant])]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6",
      },
    },
  });

  return (
    <div className={cn("rounded-lg border border-white/15", className)}>
      <RichTextToolbar editor={editor} />
      {/* Capped height so a long text scrolls inside the card instead of
          stretching the whole section editor. */}
      <div className="max-h-80 overflow-y-auto px-3 py-2">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
