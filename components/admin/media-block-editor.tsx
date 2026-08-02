"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { CldImage, CldUploadWidget, getCldImageUrl } from "next-cloudinary";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { extractCloudinaryCrop } from "@/lib/cloudinary";
import {
  BLUR_LEVELS,
  SLIDESHOW_INTERVAL_MAX,
  SLIDESHOW_INTERVAL_MIN,
  STRIP_SLIDES_OPTIONS,
  type BlurLevel,
  type MediaBlock,
  type ProjectMedia,
  type SlideshowView,
  type StripSlides,
  type VideoPlaybackMode,
} from "@/lib/project";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

const BLUR_LABEL: Record<BlurLevel, string> = {
  0: "Ingen",
  1: "Lett",
  2: "Middels",
  3: "Sterk",
};

interface MediaBlockEditorProps {
  block: MediaBlock;
  onChange: (block: MediaBlock) => void;
}

export function MediaBlockEditor({ block, onChange }: MediaBlockEditorProps) {
  // The Cloudinary upload widget is created once and keeps calling whichever
  // onSuccess closure existed at that moment, ignoring later re-renders — so
  // reading `block` there directly would silently discard any edits made
  // after the widget was created. Routing through a ref that's always
  // up to date works around it.
  const blockRef = useRef(block);
  useEffect(() => {
    blockRef.current = block;
  }, [block]);

  const { items, slideshow } = block;

  function replaceItem(index: number, item: ProjectMedia) {
    onChange({
      ...block,
      items: items.map((existing, i) => (i === index ? item : existing)),
    });
  }

  function removeItem(index: number) {
    onChange({ ...block, items: items.filter((_, i) => i !== index) });
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ ...block, items: next });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((media, index) => (
        <MediaItemEditor
          key={`${media.cloudinaryPublicId}-${index}`}
          media={media}
          index={index}
          total={items.length}
          onReplace={(item) => replaceItem(index, item)}
          onRemove={() => removeItem(index)}
          onMove={(direction) => moveItem(index, direction)}
        />
      ))}

      <CldUploadWidget
        signatureEndpoint="/api/cloudinary/sign"
        options={{
          cloudName: CLOUD_NAME,
          apiKey: API_KEY,
          sources: ["local", "url", "camera"],
          // Single-file uploads on purpose: the widget's cropping step (which
          // the aspect-locked slideshow relies on) only works with
          // multiple: false.
          multiple: false,
          resourceType: "auto",
          folder: "prosjekter",
          cropping: true,
          croppingShowDimensions: true,
          clientAllowedFormats: [
            "jpg",
            "jpeg",
            "png",
            "webp",
            "gif",
            "mp4",
            "mov",
            "webm",
          ],
        }}
        onSuccess={(result) => {
          const info = result.info;
          if (!info || typeof info === "string") return;
          const crop = extractCloudinaryCrop(info.coordinates);
          const isVideo = info.resource_type === "video";
          const current = blockRef.current;
          onChange({
            ...current,
            items: [
              ...current.items,
              {
                type: isVideo ? "video" : "image",
                cloudinaryPublicId: info.public_id,
                url: info.secure_url,
                width: crop?.width ?? info.width,
                height: crop?.height ?? info.height,
                ...(crop ? { crop } : {}),
                ...(isVideo ? { playbackMode: "player" as const } : {}),
              },
            ],
          });
        }}
      >
        {({ open }) => (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start"
            onClick={() => open()}
          >
            {items.length > 0
              ? "Legg til flere bilder/videoer"
              : "Last opp bilde/video"}
          </Button>
        )}
      </CldUploadWidget>

      {items.length > 1 && (
        <div className="flex flex-col gap-3 rounded-lg border border-white/10 p-3">
          <Label>Bildekarusell</Label>
          <p className="font-serif text-xs text-white/40">
            Flere bilder i samme blokk vises som en karusell. Besøkende kan
            alltid sveipe eller bruke pilene — bildene går i loop.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label>Visning</Label>
            <ToggleGroup
              variant="outline"
              size="sm"
              multiple={false}
              value={[slideshow.view]}
              onValueChange={(value) => {
                const next = value[0] as SlideshowView | undefined;
                if (next) {
                  onChange({ ...block, slideshow: { ...slideshow, view: next } });
                }
              }}
            >
              <ToggleGroupItem value="single">
                Ett bilde om gangen
              </ToggleGroupItem>
              <ToggleGroupItem value="strip">Flere i bredden</ToggleGroupItem>
            </ToggleGroup>
          </div>
          {slideshow.view === "strip" && (
            <div className="flex flex-col gap-1.5">
              <Label>Antall i bredden (store skjermer)</Label>
              <ToggleGroup
                variant="outline"
                size="sm"
                multiple={false}
                value={[String(slideshow.stripSlides)]}
                onValueChange={(value) => {
                  const next = value[0];
                  if (next === undefined) return;
                  onChange({
                    ...block,
                    slideshow: {
                      ...slideshow,
                      stripSlides: Number(next) as StripSlides,
                    },
                  });
                }}
              >
                {STRIP_SLIDES_OPTIONS.map((option) => (
                  <ToggleGroupItem key={option} value={String(option)}>
                    {option}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
              <p className="max-w-72 font-serif text-xs text-white/40">
                På små skjermer vises to om gangen. Loop og automatisk
                bildebytte krever flere bilder enn det som vises samtidig.
              </p>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2">
              <Switch
                id={`auto-${block.id}`}
                checked={slideshow.autoAdvance}
                onCheckedChange={(autoAdvance) =>
                  onChange({
                    ...block,
                    slideshow: { ...slideshow, autoAdvance },
                  })
                }
              />
              <Label htmlFor={`auto-${block.id}`}>Automatisk bildebytte</Label>
            </div>
            {slideshow.autoAdvance && (
              <div className="flex items-center gap-2">
                <Label htmlFor={`interval-${block.id}`}>
                  Sekunder per bilde
                </Label>
                <NumberField
                  value={slideshow.intervalSeconds}
                  min={SLIDESHOW_INTERVAL_MIN}
                  max={SLIDESHOW_INTERVAL_MAX}
                  step={1}
                  onValueChange={(value) => {
                    if (value === null) return;
                    onChange({
                      ...block,
                      slideshow: {
                        ...slideshow,
                        intervalSeconds: Math.min(
                          SLIDESHOW_INTERVAL_MAX,
                          Math.max(SLIDESHOW_INTERVAL_MIN, Math.round(value)),
                        ),
                      },
                    });
                  }}
                >
                  <NumberFieldGroup>
                    <NumberFieldDecrement>-</NumberFieldDecrement>
                    <NumberFieldInput id={`interval-${block.id}`} />
                    <NumberFieldIncrement>+</NumberFieldIncrement>
                  </NumberFieldGroup>
                </NumberField>
              </div>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <Label>Uskarphet</Label>
          <ToggleGroup
            variant="outline"
            multiple={false}
            value={[String(block.blur)]}
            onValueChange={(value) => {
              const next = value[0];
              if (next === undefined) return;
              onChange({ ...block, blur: Number(next) as BlurLevel });
            }}
          >
            {BLUR_LEVELS.map((level) => (
              <ToggleGroupItem key={level} value={String(level)}>
                {BLUR_LABEL[level]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}

function MediaItemEditor({
  media,
  index,
  total,
  onReplace,
  onRemove,
  onMove,
}: {
  media: ProjectMedia;
  index: number;
  total: number;
  onReplace: (media: ProjectMedia) => void;
  onRemove: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  // Empty optional fields are stored as absent, matching what
  // normalizeSections produces on load (dirty-state parity).
  function setOptionalText(key: "altText" | "caption", value: string) {
    const rest = { ...media };
    delete rest[key];
    onReplace(value ? { ...rest, [key]: value } : rest);
  }

  const posterPreview =
    media.type === "video" && media.posterOffsetSeconds !== undefined
      ? getCldImageUrl({
          src: media.cloudinaryPublicId,
          assetType: "video",
          format: "jpg",
          width: 320,
          height: Math.round((320 * media.height) / media.width) || 200,
          rawTransformations: [`so_${media.posterOffsetSeconds}`],
        })
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-white/10 p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5">
          {media.type === "image" ? (
            <CldImage
              src={media.cloudinaryPublicId}
              alt=""
              width={media.width}
              height={media.height}
              crop={media.crop ? { type: "crop", ...media.crop } : undefined}
              className="h-full w-full object-cover"
            />
          ) : (
            <video
              src={media.url}
              className="h-full w-full object-cover"
              muted
            />
          )}
        </div>
        {total > 1 && (
          <p className="min-w-0 flex-1 truncate font-serif text-xs text-white/40">
            Bilde {index + 1} av {total}
          </p>
        )}
        <div className="ml-auto flex items-center gap-1">
          {total > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Flytt frem"
                disabled={index === 0}
                onClick={() => onMove(-1)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Flytt bak"
                disabled={index === total - 1}
                onClick={() => onMove(1)}
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Fjern bilde/video"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {media.type === "image" && (
        <div className="flex flex-col gap-1.5">
          <Label>Alt-tekst</Label>
          <Input
            value={media.altText ?? ""}
            placeholder="Kort beskrivelse av bildet"
            onChange={(event) => setOptionalText("altText", event.target.value)}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label>Bildetekst</Label>
        <Input
          value={media.caption ?? ""}
          placeholder="F.eks. «Foto: Navn Navnesen»"
          onChange={(event) => setOptionalText("caption", event.target.value)}
        />
      </div>

      {media.type === "video" && (
        <div className="flex flex-col gap-1.5">
          <Label>Avspilling</Label>
          <ToggleGroup
            variant="outline"
            multiple={false}
            value={[media.playbackMode ?? "player"]}
            onValueChange={(value) => {
              const next = value[0] as VideoPlaybackMode | undefined;
              if (next) onReplace({ ...media, playbackMode: next });
            }}
          >
            <ToggleGroupItem value="player">Klikk for å spille</ToggleGroupItem>
            <ToggleGroupItem value="ambient">
              Ambient (autoplay, lydløs)
            </ToggleGroupItem>
          </ToggleGroup>
          {(media.playbackMode ?? "player") === "player" && (
            <div className="mt-2 flex items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`poster-${media.cloudinaryPublicId}-${index}`}>
                  Plakatbilde (sekund i videoen)
                </Label>
                <Input
                  id={`poster-${media.cloudinaryPublicId}-${index}`}
                  type="number"
                  min={0}
                  step={1}
                  className="w-28"
                  value={media.posterOffsetSeconds ?? ""}
                  placeholder="Auto"
                  onChange={(event) => {
                    const raw = event.target.value;
                    // Empty input = Cloudinary's default poster; stored as an
                    // absent field (see optional-field note above).
                    const rest = { ...media };
                    delete rest.posterOffsetSeconds;
                    const parsed = Number(raw);
                    onReplace(
                      raw !== "" && Number.isFinite(parsed) && parsed >= 0
                        ? { ...rest, posterOffsetSeconds: parsed }
                        : rest,
                    );
                  }}
                />
              </div>
              {posterPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={posterPreview}
                  alt="Forhåndsvisning av plakatbilde"
                  className="h-20 w-32 rounded-lg border border-white/15 object-cover"
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
