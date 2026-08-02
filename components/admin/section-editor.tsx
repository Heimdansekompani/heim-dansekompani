"use client";

import { useState } from "react";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Settings2,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ColorField } from "@/components/admin/color-field";
import { MediaBlockEditor } from "@/components/admin/media-block-editor";
import { TextBlockEditor } from "@/components/admin/text-block-editor";
import {
  BLOCK_WIDTH_OPTIONS,
  SPLIT_OPTIONS,
  createMediaBlock,
  createTextBlock,
  extractPlainText,
  isSectionEmpty,
  visibleBlocks,
  type BlockWidthPercent,
  type HorizontalAlign,
  type ProjectSectionData,
  type SectionBlock,
  type SectionMode,
  type SplitPercent,
  type VerticalAlign,
} from "@/lib/project";
import { cn } from "@/lib/utils";

const MODE_LABEL: Record<SectionMode, string> = {
  single: "Én blokk",
  split: "To blokker",
  overlay: "Tekst på bilde",
};

const KIND_LABEL: Record<SectionBlock["kind"], string> = {
  media: "Bilde/video",
  text: "Tekst",
};

interface SectionEditorProps {
  section: ProjectSectionData;
  index: number;
  total: number;
  onChange: (section: ProjectSectionData) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
}

export function SectionEditor({
  section,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  onDuplicate,
}: SectionEditorProps) {
  // New (empty) sections open ready to edit; loaded ones start as compact
  // one-line summaries so long pages stay scannable. Keyed by section.id in
  // the hosts, so the state survives move up/down.
  const [expanded, setExpanded] = useState(() => isSectionEmpty(section));
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const { layout, style, blocks } = section;
  const visible = visibleBlocks(section);
  const hiddenBlocks = blocks.slice(visible.length);

  function updateLayout(patch: Partial<ProjectSectionData["layout"]>) {
    onChange({ ...section, layout: { ...layout, ...patch } });
  }

  function updateStyle(patch: Partial<ProjectSectionData["style"]>) {
    onChange({ ...section, style: { ...style, ...patch } });
  }

  function updateBlock(updated: SectionBlock) {
    onChange({
      ...section,
      blocks: blocks.map((block) =>
        block.id === updated.id ? updated : block,
      ),
    });
  }

  function setMode(mode: SectionMode) {
    // Never drop existing blocks on a mode switch — hidden content must
    // survive toggling back. Only append a complementary block when a
    // two-block mode needs one.
    let nextBlocks = blocks;
    if (mode !== "single" && blocks.length < 2) {
      nextBlocks = [
        ...blocks,
        blocks[0]?.kind === "text" ? createMediaBlock() : createTextBlock(),
      ];
    }
    onChange({ ...section, blocks: nextBlocks, layout: { ...layout, mode } });
  }

  function setBlockKind(blockIndex: number, kind: SectionBlock["kind"]) {
    const current = blocks[blockIndex];
    if (!current || current.kind === kind) return;
    const replacement =
      kind === "media" ? createMediaBlock() : createTextBlock();
    onChange({
      ...section,
      blocks: blocks.map((block, i) => (i === blockIndex ? replacement : block)),
    });
  }

  function swapBlocks() {
    if (blocks.length < 2) return;
    onChange({ ...section, blocks: [...blocks].reverse() });
  }

  function setOverlap(enabled: boolean) {
    // Snapping only reads sensibly with a text block narrower than the page
    // — nudge a full-width second text block down to half.
    const second = blocks[1];
    const nextBlocks =
      enabled && second?.kind === "text" && second.widthPercent === 100
        ? blocks.map((block, i) =>
            i === 1 && block.kind === "text"
              ? { ...block, widthPercent: 50 as const }
              : block,
          )
        : blocks;
    onChange({
      ...section,
      blocks: nextBlocks,
      layout: { ...layout, overlap: enabled ? "half" : "none" },
    });
  }

  const textExcerpt = (() => {
    const firstText = blocks.find((block) => block.kind === "text");
    if (!firstText || firstText.kind !== "text") return "";
    return extractPlainText(firstText.richText).slice(0, 50);
  })();

  const summaryParts = [
    MODE_LABEL[layout.mode],
    visible.map((block) => KIND_LABEL[block.kind]).join(" + "),
  ];
  if (layout.mode === "split") {
    summaryParts.push(`${layout.splitPercent}/${100 - layout.splitPercent}`);
  }

  const overlayMissingKinds =
    layout.mode === "overlay" &&
    (!blocks.some((block) => block.kind === "media") ||
      !blocks.some((block) => block.kind === "text"));

  return (
    <div className="rounded-lg border border-white/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
          aria-expanded={expanded}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 shrink-0 text-white/50 transition-transform",
              expanded && "rotate-90",
            )}
          />
          <p className="truncate font-serif text-sm text-white/50">
            Seksjon {index + 1} — {summaryParts.join(" · ")}
            {textExcerpt && (
              <span className="text-white/30"> — «{textExcerpt}»</span>
            )}
          </p>
        </button>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Flytt opp"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Flytt ned"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Dupliser seksjon"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Fjern seksjon"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <Label>Oppsett</Label>
              <ToggleGroup
                className="mt-1.5"
                variant="outline"
                multiple={false}
                value={[layout.mode]}
                onValueChange={(value) => {
                  const next = value[0] as SectionMode | undefined;
                  if (next) setMode(next);
                }}
              >
                <ToggleGroupItem value="single">
                  {MODE_LABEL.single}
                </ToggleGroupItem>
                <ToggleGroupItem value="split">
                  {MODE_LABEL.split}
                </ToggleGroupItem>
                <ToggleGroupItem value="overlay">
                  {MODE_LABEL.overlay}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            {visible.length === 2 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={swapBlocks}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Bytt om blokkene
              </Button>
            )}
          </div>

          {overlayMissingKinds && (
            <p className="font-serif text-xs text-amber-400/80">
              «Tekst på bilde» trenger både en bilde-/videoblokk og en
              tekstblokk.
            </p>
          )}

          <div
            className={cn(
              "grid gap-4",
              visible.length === 2 && "lg:grid-cols-2",
            )}
          >
            {visible.map((block, blockIndex) => (
              <div
                key={block.id}
                className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <Label>
                    {visible.length === 2
                      ? `Blokk ${blockIndex + 1}`
                      : "Innhold"}
                  </Label>
                  <ToggleGroup
                    variant="outline"
                    size="sm"
                    multiple={false}
                    value={[block.kind]}
                    onValueChange={(value) => {
                      const next = value[0] as SectionBlock["kind"] | undefined;
                      if (next) setBlockKind(blockIndex, next);
                    }}
                  >
                    <ToggleGroupItem value="text">Tekst</ToggleGroupItem>
                    <ToggleGroupItem value="media">Bilde/video</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div className="mt-3 flex flex-col gap-4">
                  {block.kind === "media" ? (
                    <>
                      <MediaBlockEditor block={block} onChange={updateBlock} />
                      {/* Width/placement is section-level layout, but shown
                          here (like the text block's Tekstbredde) so all
                          sizing lives on the block it affects. Split mode is
                          sized by Fordeling instead. */}
                      {(layout.mode === "single" ||
                        layout.mode === "overlay") && (
                        <>
                          <div className="flex flex-col gap-1.5">
                            <Label>Bildebredde (store skjermer)</Label>
                            <ToggleGroup
                              variant="outline"
                              multiple={false}
                              value={[String(layout.blockWidthPercent)]}
                              onValueChange={(value) => {
                                const next = value[0];
                                if (next === undefined) return;
                                updateLayout({
                                  blockWidthPercent: Number(
                                    next,
                                  ) as BlockWidthPercent,
                                });
                              }}
                            >
                              {BLOCK_WIDTH_OPTIONS.map((option) => (
                                <ToggleGroupItem
                                  key={option}
                                  value={String(option)}
                                >
                                  {option === 100 ? "Full" : `${option} %`}
                                </ToggleGroupItem>
                              ))}
                            </ToggleGroup>
                          </div>
                          {layout.blockWidthPercent !== 100 && (
                            <div className="flex flex-col gap-1.5">
                              <Label>Plassering (store skjermer)</Label>
                              <ToggleGroup
                                variant="outline"
                                multiple={false}
                                value={[layout.blockAlign]}
                                onValueChange={(value) => {
                                  const next = value[0] as
                                    | HorizontalAlign
                                    | undefined;
                                  if (next) {
                                    updateLayout({ blockAlign: next });
                                  }
                                }}
                              >
                                <ToggleGroupItem value="left">
                                  Venstre
                                </ToggleGroupItem>
                                <ToggleGroupItem value="center">
                                  Midt
                                </ToggleGroupItem>
                                <ToggleGroupItem value="right">
                                  Høyre
                                </ToggleGroupItem>
                              </ToggleGroup>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <TextBlockEditor block={block} onChange={updateBlock} />
                  )}
                </div>
              </div>
            ))}
          </div>

          {hiddenBlocks.map((block, hiddenIndex) => (
            <div
              key={block.id}
              className="rounded-lg border border-dashed border-white/10 p-3"
            >
              <p className="font-serif text-xs text-white/40">
                Blokk {visible.length + hiddenIndex + 1} (
                {KIND_LABEL[block.kind]}) vises ikke i dette oppsettet —
                innholdet beholdes og kommer tilbake hvis du bytter oppsett.
              </p>
            </div>
          ))}

          <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
            <CollapsibleTrigger
              render={<Button type="button" variant="ghost" size="sm" />}
            >
              <Settings2 className="h-4 w-4" />
              Flere innstillinger
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  advancedOpen && "rotate-180",
                )}
              />
            </CollapsibleTrigger>
            <CollapsiblePanel>
              <div className="mt-4 flex flex-wrap items-start gap-x-8 gap-y-5">
                {layout.mode === "split" && (
                  <>
                    <div>
                      <Label>Fordeling (bredde blokk 1)</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[String(layout.splitPercent)]}
                        onValueChange={(value) => {
                          const next = value[0];
                          if (next === undefined) return;
                          updateLayout({
                            splitPercent: Number(next) as SplitPercent,
                          });
                        }}
                      >
                        {SPLIT_OPTIONS.map((option) => (
                          <ToggleGroupItem key={option} value={String(option)}>
                            {option} %
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                    <div>
                      <Label>Øverst på små skjermer</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[layout.reverseStack ? "second" : "first"]}
                        onValueChange={(value) => {
                          const next = value[0];
                          if (next) {
                            updateLayout({ reverseStack: next === "second" });
                          }
                        }}
                      >
                        <ToggleGroupItem value="first">Blokk 1</ToggleGroupItem>
                        <ToggleGroupItem value="second">
                          Blokk 2
                        </ToggleGroupItem>
                      </ToggleGroup>
                      
                    </div>
                    <div>
                      <Label>Vertikal justering</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[layout.verticalAlign]}
                        onValueChange={(value) => {
                          const next = value[0] as VerticalAlign | undefined;
                          if (next) updateLayout({ verticalAlign: next });
                        }}
                      >
                        <ToggleGroupItem value="start">Topp</ToggleGroupItem>
                        <ToggleGroupItem value="center">Midt</ToggleGroupItem>
                        <ToggleGroupItem value="end">Bunn</ToggleGroupItem>
                      </ToggleGroup>
                      
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`overlap-${section.id}`}>
                        Fest blokk 2 til kanten av blokk 1 (overlapp)
                      </Label>
                      <Switch
                        id={`overlap-${section.id}`}
                        checked={layout.overlap === "half"}
                        onCheckedChange={setOverlap}
                      />
                      <p className="max-w-64 font-serif text-xs text-white/40">
                        Midten av blokk 2 legges på kanten av blokk 1. På små
                        skjermer vises blokkene under hverandre som vanlig.
                      </p>
                    </div>
                    {layout.overlap === "half" && (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor={`mirror-${section.id}`}>
                          Speilvend (blokk 1 til høyre)
                        </Label>
                        <Switch
                          id={`mirror-${section.id}`}
                          checked={layout.mirror}
                          onCheckedChange={(mirror) => updateLayout({ mirror })}
                        />
                      </div>
                    )}
                  </>
                )}

                {layout.mode === "overlay" && (
                  <>
                    <div>
                      <Label>Tekst vertikalt</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[layout.verticalAlign]}
                        onValueChange={(value) => {
                          const next = value[0] as VerticalAlign | undefined;
                          if (next) updateLayout({ verticalAlign: next });
                        }}
                      >
                        <ToggleGroupItem value="start">Topp</ToggleGroupItem>
                        <ToggleGroupItem value="center">Midt</ToggleGroupItem>
                        <ToggleGroupItem value="end">Bunn</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div>
                      <Label>Tekst horisontalt</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[layout.overlayAlign]}
                        onValueChange={(value) => {
                          const next = value[0] as HorizontalAlign | undefined;
                          if (next) updateLayout({ overlayAlign: next });
                        }}
                      >
                        <ToggleGroupItem value="left">Venstre</ToggleGroupItem>
                        <ToggleGroupItem value="center">Midt</ToggleGroupItem>
                        <ToggleGroupItem value="right">Høyre</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    <div>
                      <Label>På små skjermer</Label>
                      <ToggleGroup
                        className="mt-1.5"
                        variant="outline"
                        multiple={false}
                        value={[layout.overlayNarrow]}
                        onValueChange={(value) => {
                          const next = value[0] as
                            | "stack"
                            | "overlay"
                            | undefined;
                          if (next) updateLayout({ overlayNarrow: next });
                        }}
                      >
                        <ToggleGroupItem value="stack">
                          Tekst under bildet
                        </ToggleGroupItem>
                        <ToggleGroupItem value="overlay">
                          Tekst på bildet
                        </ToggleGroupItem>
                      </ToggleGroup>
                      <p className="mt-1.5 max-w-64 font-serif text-xs text-white/40">
                        Bildet krymper mer enn teksten på små skjermer — «under
                        bildet» unngår at teksten dominerer eller renner utenfor.
                      </p>
                    </div>
                  </>
                )}

                <ColorField
                  label="Bakgrunnsfarge for seksjonen"
                  value={style.background}
                  onChange={(background) => updateStyle({ background })}
                />

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`fullbleed-${section.id}`}>
                    Full bredde (kant til kant)
                  </Label>
                  <Switch
                    id={`fullbleed-${section.id}`}
                    checked={style.fullBleed}
                    onCheckedChange={(fullBleed) => updateStyle({ fullBleed })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor={`flush-${section.id}`}>
                    Ingen avstand til forrige seksjon
                  </Label>
                  <Switch
                    id={`flush-${section.id}`}
                    checked={style.flushTop}
                    disabled={index === 0}
                    onCheckedChange={(flushTop) => updateStyle({ flushTop })}
                  />
                </div>
              </div>
            </CollapsiblePanel>
          </Collapsible>
        </div>
      )}
    </div>
  );
}
