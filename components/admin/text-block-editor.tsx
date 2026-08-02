"use client";

import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import {
  TEXT_WIDTH_OPTIONS,
  type HorizontalAlign,
  type TextBlock,
  type TextWidthPercent,
} from "@/lib/project";

interface TextBlockEditorProps {
  block: TextBlock;
  onChange: (block: TextBlock) => void;
}

export function TextBlockEditor({ block, onChange }: TextBlockEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <RichTextEditor
        content={block.richText}
        onChange={(richText) => onChange({ ...block, richText })}
      />
      <div className="flex flex-col gap-1.5">
        <Label>Tekstbredde (store skjermer)</Label>
        <ToggleGroup
          variant="outline"
          multiple={false}
          value={[String(block.widthPercent)]}
          onValueChange={(value) => {
            const next = value[0];
            if (next === undefined) return;
            onChange({
              ...block,
              widthPercent: Number(next) as TextWidthPercent,
            });
          }}
        >
          {TEXT_WIDTH_OPTIONS.map((option) => (
            <ToggleGroupItem key={option} value={String(option)}>
              {option === 100 ? "Full" : `${option} %`}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="font-serif text-xs text-white/40">
          På små skjermer brukes alltid full bredde.
        </p>
      </div>
      {block.widthPercent !== 100 && (
        <div className="flex flex-col gap-1.5">
          <Label>Plassering (store skjermer)</Label>
          <ToggleGroup
            variant="outline"
            multiple={false}
            value={[block.align]}
            onValueChange={(value) => {
              const next = value[0] as HorizontalAlign | undefined;
              if (next) onChange({ ...block, align: next });
            }}
          >
            <ToggleGroupItem value="left">Venstre</ToggleGroupItem>
            <ToggleGroupItem value="center">Midt</ToggleGroupItem>
            <ToggleGroupItem value="right">Høyre</ToggleGroupItem>
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
