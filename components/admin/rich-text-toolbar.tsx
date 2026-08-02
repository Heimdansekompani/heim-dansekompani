"use client";

import { useState, type ReactNode } from "react";
import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Palette,
  Type,
  Underline,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FONT_SIZE_OPTIONS,
  isButtonLinkVariant,
  type LinkVariant,
} from "@/lib/rich-text-constants";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

function ToolbarButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-white/10 text-white")}
      onClick={onClick}
    >
      {icon}
    </Button>
  );
}

const QUICK_COLORS = ["#ffffff", "#cccccc", "#000000"];

export function RichTextToolbar({ editor }: { editor: Editor | null }) {
  const [linkUrl, setLinkUrl] = useState("");
  const [linkVariant, setLinkVariant] = useState<LinkVariant>("link");
  const [pickedColor, setPickedColor] = useState("#ffffff");

  if (!editor) return null;

  function applyLink() {
    if (!editor) return;
    if (!linkUrl.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    // setMark rather than setLink: setLink's typed signature doesn't know
    // about the custom variant attribute. extendMarkRange makes editing an
    // existing link update the whole link, not just the selection.
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setMark("link", { href: linkUrl.trim(), variant: linkVariant })
      .run();
    setLinkUrl("");
  }

  // Prefill from the link under the cursor so its URL or style can be
  // changed without retyping.
  function syncLinkStateFromSelection() {
    if (!editor) return;
    const attrs = editor.getAttributes("link");
    setLinkUrl(typeof attrs.href === "string" ? attrs.href : "");
    setLinkVariant(isButtonLinkVariant(attrs.variant) ? attrs.variant : "link");
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-white/15 p-2">
      <ToolbarButton
        label="Fet"
        icon={<Bold className="h-4 w-4" />}
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      />
      <ToolbarButton
        label="Kursiv"
        icon={<Italic className="h-4 w-4" />}
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      />
      <ToolbarButton
        label="Understrek"
        icon={<Underline className="h-4 w-4" />}
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      />

      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />

      <ToolbarButton
        label="Venstrejuster"
        icon={<AlignLeft className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      />
      <ToolbarButton
        label="Midtstill"
        icon={<AlignCenter className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      />
      <ToolbarButton
        label="Høyrejuster"
        icon={<AlignRight className="h-4 w-4" />}
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      />

      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />

      <ToolbarButton
        label="Punktliste"
        icon={<List className="h-4 w-4" />}
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      />
      <ToolbarButton
        label="Nummerert liste"
        icon={<ListOrdered className="h-4 w-4" />}
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      />

      <span className="mx-1 h-5 w-px bg-white/15" aria-hidden="true" />

      <Popover
        onOpenChange={(open) => {
          if (open) syncLinkStateFromSelection();
        }}
      >
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Lenke"
              className={cn(
                editor.isActive("link") && "bg-white/10 text-white",
              )}
            />
          }
        >
          <Link2 className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://…"
              />
              <Button type="button" size="sm" onClick={applyLink}>
                Sett inn
              </Button>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-white/50">Utseende</p>
              <ToggleGroup
                variant="outline"
                size="sm"
                multiple={false}
                value={[linkVariant]}
                onValueChange={(value) => {
                  const next = value[0] as LinkVariant | undefined;
                  if (next) setLinkVariant(next);
                }}
              >
                <ToggleGroupItem value="link">Lenke</ToggleGroupItem>
                <ToggleGroupItem value="button">Knapp</ToggleGroupItem>
                <ToggleGroupItem value="button-outline">
                  Knapp (omriss)
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Skriftstørrelse"
            />
          }
        >
          <Type className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-40">
          <div className="flex flex-col gap-1">
            {FONT_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  editor.chain().focus().setFontSize(option.value).run()
                }
                className="cursor-pointer rounded px-2 py-1 text-left text-sm hover:bg-white/10"
              >
                {option.label}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Tekstfarge"
            />
          }
        >
          <Palette className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="w-56">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label="Velg farge"
                value={pickedColor}
                onChange={(event) => setPickedColor(event.target.value)}
                className="h-8 w-10 cursor-pointer rounded border border-white/20 bg-transparent"
              />
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  editor.chain().focus().setColor(pickedColor).run()
                }
              >
                Bruk
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {QUICK_COLORS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  title={hex}
                  onClick={() => editor.chain().focus().setColor(hex).run()}
                  className="h-6 w-6 cursor-pointer rounded-full border border-white/20"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-start"
              onClick={() => editor.chain().focus().unsetColor().run()}
            >
              Fjern farge
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
