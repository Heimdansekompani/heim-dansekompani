import type { JSONContent } from "@tiptap/core";
import type { Timestamp } from "firebase/firestore";

import type { CloudinaryCropRect } from "@/lib/cloudinary";
import { isValidHexColor } from "@/lib/rich-text-constants";

// Landscape rather than the team's 4:5 portrait ratio — this is a cover
// image for a grid of cards, not a person's photo.
export const THUMBNAIL_ASPECT_RATIO = 4 / 3;

export type ProjectMediaCrop = CloudinaryCropRect;

export interface ProjectThumbnail {
  cloudinaryPublicId: string;
  url: string;
  width: number;
  height: number;
  crop?: ProjectMediaCrop;
}

export type VideoPlaybackMode = "player" | "ambient";

export interface ProjectMedia {
  type: "image" | "video";
  cloudinaryPublicId: string;
  url: string;
  width: number;
  height: number;
  altText?: string;
  // The Cloudinary upload widget's cropping step only records the selected
  // rectangle as metadata on the original asset — it doesn't bake the crop
  // into the stored image. This is applied as an explicit crop
  // transformation at render time (see SectionMedia) so it's actually
  // reflected in what gets displayed.
  crop?: ProjectMediaCrop;
  // Video only. "player": click to play with controls. "ambient": autoplays
  // muted in a loop with no controls — background footage, not content the
  // visitor is meant to seek through.
  playbackMode?: VideoPlaybackMode;
  // Video + "player" only: which second of the video to use as the poster
  // frame shown before playback starts.
  posterOffsetSeconds?: number;
  // Shown under the media (photographer credit, description). In a slideshow
  // the caption follows the visible slide.
  caption?: string;
}

export const BLUR_LEVELS = [0, 1, 2, 3] as const;
export type BlurLevel = (typeof BLUR_LEVELS)[number];

// Cloudinary e_blur strengths per level — applied server-side by Cloudinary
// so there's no CSS blur edge-fringe, and it works for both images and video.
export const BLUR_STRENGTH: Record<BlurLevel, number> = {
  0: 0,
  1: 300,
  2: 800,
  3: 2000,
};

export const SLIDESHOW_INTERVAL_MIN = 2;
export const SLIDESHOW_INTERVAL_MAX = 15;
export const SLIDESHOW_INTERVAL_DEFAULT = 5;

// "single": one full-width slide at a time. "strip": a filmstrip showing
// several slides in the width (stripSlides on large screens, 2 when the
// container is narrow).
export type SlideshowView = "single" | "strip";

export const STRIP_SLIDES_OPTIONS = [2, 3, 4] as const;
export type StripSlides = (typeof STRIP_SLIDES_OPTIONS)[number];

// Settings for a media block with 2+ items. Swipe/arrow/dot navigation and
// looping are always on — autoAdvance only controls the timer. Persists on
// single-item blocks (like SectionLayout's flat bag) so removing slides and
// re-adding them later loses nothing.
export interface SlideshowSettings {
  autoAdvance: boolean;
  intervalSeconds: number;
  view: SlideshowView;
  // strip only: slides visible at once on large screens.
  stripSlides: StripSlides;
}

export interface MediaBlock {
  id: string;
  kind: "media";
  // 1 item renders as plain media, 2+ as a slideshow. Empty only while being
  // drafted in the admin editor — a visible media block without media can't
  // be saved (enforced client-side, since Firestore rules trust verified
  // admins).
  items: ProjectMedia[];
  // Applies to every item in the block.
  blur: BlurLevel;
  slideshow: SlideshowSettings;
}

export const TEXT_WIDTH_OPTIONS = [50, 60, 75, 100] as const;
export type TextWidthPercent = (typeof TEXT_WIDTH_OPTIONS)[number];

export interface TextBlock {
  id: string;
  kind: "text";
  richText: JSONContent;
  // Max width on large screens only — stacked (narrow-container) layouts
  // always give text the full width, since 60% of a phone screen is cramped.
  widthPercent: TextWidthPercent;
  // Where a narrowed (widthPercent < 100) block sits within its space on
  // large screens. This positions the block; text alignment inside it is a
  // rich-text (toolbar) concern.
  align: HorizontalAlign;
}

export type SectionBlock = MediaBlock | TextBlock;

export type SectionMode = "single" | "split" | "overlay";

export const SPLIT_OPTIONS = [25, 33, 50, 66, 75] as const;
export type SplitPercent = (typeof SPLIT_OPTIONS)[number];

export const BLOCK_WIDTH_OPTIONS = [25, 33, 50, 66, 75, 90, 100] as const;
export type BlockWidthPercent = (typeof BLOCK_WIDTH_OPTIONS)[number];

export type VerticalAlign = "start" | "center" | "end";
export type HorizontalAlign = "left" | "center" | "right";

// Every knob persists even while the current mode ignores it — switching a
// section from "split" to "single" and back must lose nothing, so layout is
// a flat bag of settings rather than a per-mode discriminated union.
export interface SectionLayout {
  mode: SectionMode;
  // split: width of blocks[0] on large screens; blocks[1] gets the rest.
  // Desktop side comes from array order alone: blocks[0] left, blocks[1]
  // right (the editor's "Bytt om blokkene" reorders the array).
  splitPercent: SplitPercent;
  // split: blocks[1] renders on top when stacked on small screens
  // (default is array order, blocks[0] on top).
  reverseStack: boolean;
  // split with overlap: mirror horizontally — blocks[0] sits right and
  // blocks[1] snaps to its left edge. Only meaningful because overlap roles
  // are asymmetric (blocks[0] is the base layer, blocks[1] floats on top).
  mirror: boolean;
  // split: cross-axis alignment. overlay: vertical text position.
  verticalAlign: VerticalAlign;
  // split: "half" snaps the second block's center to the first block's
  // inner edge so they overlap; falls back to plain stacking when narrow.
  overlap: "none" | "half";
  // single: width of the lone block on large screens…
  blockWidthPercent: BlockWidthPercent;
  // …and where the remaining space goes.
  blockAlign: HorizontalAlign;
  // overlay: horizontal text position on the media.
  overlayAlign: HorizontalAlign;
  // overlay: what happens when the container is narrow. "stack" (default)
  // moves the text below the media — on phones the media shrinks faster
  // than the text, which otherwise dominates or overflows it. "overlay"
  // keeps the text on the media (short hero titles).
  overlayNarrow: "stack" | "overlay";
}

export interface SectionStyle {
  // Section background hex; null = transparent. Rendered as a full-viewport
  // band behind the section's content column.
  background: string | null;
  // Content spans the viewport edge to edge instead of the page column.
  fullBleed: boolean;
  // No gap to the previous section, so adjacent media can touch.
  flushTop: boolean;
}

export interface ProjectSectionData {
  id: string;
  version: 2;
  layout: SectionLayout;
  style: SectionStyle;
  // 1–2 blocks. "single" renders only blocks[0] but blocks[1] is retained in
  // data so hidden content survives toggling modes. "split" renders both
  // side by side. "overlay" expects [media, text] and renders text on top.
  blocks: SectionBlock[];
}

export function createEmptyRichText(): JSONContent {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

export function createMediaBlock(id?: string): MediaBlock {
  return {
    id: id ?? crypto.randomUUID(),
    kind: "media",
    items: [],
    blur: 0,
    slideshow: createDefaultSlideshow(),
  };
}

function createDefaultSlideshow(): SlideshowSettings {
  return {
    autoAdvance: false,
    intervalSeconds: SLIDESHOW_INTERVAL_DEFAULT,
    view: "single",
    stripSlides: 3,
  };
}

export function createTextBlock(id?: string): TextBlock {
  return {
    id: id ?? crypto.randomUUID(),
    kind: "text",
    richText: createEmptyRichText(),
    widthPercent: 100,
    align: "left",
  };
}

export function createEmptySection(): ProjectSectionData {
  return {
    id: crypto.randomUUID(),
    version: 2,
    layout: createDefaultLayout(),
    style: { background: null, fullBleed: false, flushTop: false },
    blocks: [createMediaBlock(), createTextBlock()],
  };
}

function createDefaultLayout(): SectionLayout {
  return {
    mode: "split",
    splitPercent: 50,
    reverseStack: false,
    mirror: false,
    verticalAlign: "center",
    overlap: "none",
    blockWidthPercent: 100,
    blockAlign: "center",
    overlayAlign: "center",
    overlayNarrow: "stack",
  };
}

// ---------------------------------------------------------------------------
// Normalization — the only place legacy (v1) section data is understood.
//
// Sections are migrated on read, not by a migration script: public pages and
// the admin editor normalize whatever Firestore hands them, and the editor
// always saves back fully-populated v2 data, so documents self-migrate on
// their next save.
//
// Normalization MUST be deterministic (same input → identical output, no
// crypto.randomUUID() on data that has an id to derive from): both admin
// host forms detect unsaved changes by comparing JSON.stringify snapshots,
// so a nondeterministic normalize would make every loaded document look
// dirty. It must also never emit `undefined` values — Firestore rejects
// them; optional fields are omitted instead.
// ---------------------------------------------------------------------------

export function normalizeSections(raw: unknown): ProjectSectionData[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((section) => normalizeSection(section))
    .filter((section): section is ProjectSectionData => section !== null);
}

export function normalizeSection(raw: unknown): ProjectSectionData | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : null;
  if (!id) return null;

  if (Array.isArray(raw.blocks)) {
    // Already v2 — re-validate field by field so missing/foreign values fall
    // back to defaults instead of leaking into render.
    const blocks = raw.blocks
      .slice(0, 2)
      .map((block, index) => normalizeBlock(block, `${id}:b${index}`))
      .filter((block): block is SectionBlock => block !== null);
    if (blocks.length === 0) blocks.push(createTextBlock(`${id}:t`));
    return {
      id,
      version: 2,
      layout: normalizeLayout(raw.layout),
      style: normalizeStyle(raw.style),
      blocks,
    };
  }

  return normalizeLegacySection(id, raw);
}

// v1 sections: { layout: { imagePosition, mediaWidthPercent }, media, richText }
function normalizeLegacySection(
  id: string,
  raw: Record<string, unknown>,
): ProjectSectionData {
  const legacyLayout = isRecord(raw.layout) ? raw.layout : {};
  const widthPercent = oneOf(
    [0, 25, 50, 75, 100] as const,
    legacyLayout.mediaWidthPercent,
    50,
  );
  const media = normalizeMedia(raw.media);

  // Block ids are derived from the section id so normalizing the same
  // document twice yields identical JSON (see determinism note above).
  const mediaBlock: MediaBlock = {
    id: `${id}:m`,
    kind: "media",
    items: media ? [media] : [],
    blur: 0,
    slideshow: createDefaultSlideshow(),
  };
  const textBlock: TextBlock = {
    id: `${id}:t`,
    kind: "text",
    richText: normalizeRichText(raw.richText),
    widthPercent: 100,
    align: "left",
  };

  const layout = createDefaultLayout();
  const style: SectionStyle = {
    background: null,
    fullBleed: false,
    flushTop: false,
  };

  if (widthPercent === 0) {
    // "Bare tekst": text only; an uploaded-but-hidden image is retained.
    layout.mode = "single";
    return {
      id,
      version: 2,
      layout,
      style,
      blocks: media ? [textBlock, mediaBlock] : [textBlock],
    };
  }

  if (widthPercent === 100) {
    // "Bare bilde": media only; authored text is retained hidden, matching
    // the old renderer which kept richText in data but never displayed it.
    layout.mode = "single";
    return { id, version: 2, layout, style, blocks: [mediaBlock, textBlock] };
  }

  layout.mode = "split";
  if (legacyLayout.imagePosition === "right") {
    // Desktop side is array order now, so a right-side image becomes
    // [text, media] with the complementary split (25/50/75 mirrors to
    // 75/50/25, all valid options). reverseStack keeps the media on top
    // when stacked on small screens, matching the old renderer.
    layout.splitPercent = (100 - widthPercent) as SplitPercent;
    layout.reverseStack = true;
    return { id, version: 2, layout, style, blocks: [textBlock, mediaBlock] };
  }
  layout.splitPercent = widthPercent;
  return { id, version: 2, layout, style, blocks: [mediaBlock, textBlock] };
}

function normalizeBlock(raw: unknown, fallbackId: string): SectionBlock | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" && raw.id ? raw.id : fallbackId;

  if (raw.kind === "media") {
    // Early-v2 media blocks stored a single `media` field; it migrates to a
    // one-item `items` array here (on read, like the v1 section migration).
    const items = Array.isArray(raw.items)
      ? raw.items
          .map((item) => normalizeMedia(item))
          .filter((item): item is ProjectMedia => item !== null)
      : (() => {
          const media = normalizeMedia(raw.media);
          return media ? [media] : [];
        })();
    return {
      id,
      kind: "media",
      items,
      blur: oneOf(BLUR_LEVELS, raw.blur, 0),
      slideshow: normalizeSlideshow(raw.slideshow),
    };
  }

  if (raw.kind === "text") {
    return {
      id,
      kind: "text",
      richText: normalizeRichText(raw.richText),
      widthPercent: oneOf(TEXT_WIDTH_OPTIONS, raw.widthPercent, 100),
      align: oneOf(["left", "center", "right"] as const, raw.align, "left"),
    };
  }

  return null;
}

function normalizeLayout(raw: unknown): SectionLayout {
  const layout = isRecord(raw) ? raw : {};
  return {
    mode: oneOf(["single", "split", "overlay"] as const, layout.mode, "split"),
    splitPercent: oneOf(SPLIT_OPTIONS, layout.splitPercent, 50),
    reverseStack: layout.reverseStack === true,
    mirror: layout.mirror === true,
    verticalAlign: oneOf(
      ["start", "center", "end"] as const,
      layout.verticalAlign,
      "center",
    ),
    overlap: layout.overlap === "half" ? "half" : "none",
    blockWidthPercent: oneOf(
      BLOCK_WIDTH_OPTIONS,
      layout.blockWidthPercent,
      100,
    ),
    blockAlign: oneOf(
      ["left", "center", "right"] as const,
      layout.blockAlign,
      "center",
    ),
    overlayAlign: oneOf(
      ["left", "center", "right"] as const,
      layout.overlayAlign,
      "center",
    ),
    overlayNarrow: layout.overlayNarrow === "overlay" ? "overlay" : "stack",
  };
}

function normalizeSlideshow(raw: unknown): SlideshowSettings {
  const settings = isRecord(raw) ? raw : {};
  const interval =
    typeof settings.intervalSeconds === "number" &&
    Number.isFinite(settings.intervalSeconds)
      ? Math.min(
          SLIDESHOW_INTERVAL_MAX,
          Math.max(SLIDESHOW_INTERVAL_MIN, Math.round(settings.intervalSeconds)),
        )
      : SLIDESHOW_INTERVAL_DEFAULT;
  return {
    autoAdvance: settings.autoAdvance === true,
    intervalSeconds: interval,
    view: settings.view === "strip" ? "strip" : "single",
    stripSlides: oneOf(STRIP_SLIDES_OPTIONS, settings.stripSlides, 3),
  };
}

function normalizeStyle(raw: unknown): SectionStyle {
  const style = isRecord(raw) ? raw : {};
  return {
    background: isValidHexColor(style.background) ? style.background : null,
    fullBleed: style.fullBleed === true,
    flushTop: style.flushTop === true,
  };
}

function normalizeMedia(raw: unknown): ProjectMedia | null {
  if (!isRecord(raw)) return null;
  if (raw.type !== "image" && raw.type !== "video") return null;
  if (
    typeof raw.cloudinaryPublicId !== "string" ||
    typeof raw.url !== "string" ||
    typeof raw.width !== "number" ||
    typeof raw.height !== "number"
  ) {
    return null;
  }

  const media: ProjectMedia = {
    type: raw.type,
    cloudinaryPublicId: raw.cloudinaryPublicId,
    url: raw.url,
    width: raw.width,
    height: raw.height,
  };
  if (typeof raw.altText === "string" && raw.altText) {
    media.altText = raw.altText;
  }
  if (typeof raw.caption === "string" && raw.caption) {
    media.caption = raw.caption;
  }
  const crop = normalizeCrop(raw.crop);
  if (crop) media.crop = crop;
  if (raw.type === "video") {
    media.playbackMode = raw.playbackMode === "ambient" ? "ambient" : "player";
    if (
      typeof raw.posterOffsetSeconds === "number" &&
      Number.isFinite(raw.posterOffsetSeconds) &&
      raw.posterOffsetSeconds >= 0
    ) {
      media.posterOffsetSeconds = raw.posterOffsetSeconds;
    }
  }
  return media;
}

function normalizeCrop(raw: unknown): ProjectMediaCrop | null {
  if (!isRecord(raw)) return null;
  const { x, y, width, height } = raw;
  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    typeof width !== "number" ||
    typeof height !== "number"
  ) {
    return null;
  }
  return { x, y, width, height };
}

function normalizeRichText(raw: unknown): JSONContent {
  if (isRecord(raw) && raw.type === "doc") return raw as JSONContent;
  return createEmptyRichText();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function oneOf<const T extends readonly unknown[]>(
  options: T,
  value: unknown,
  fallback: T[number],
): T[number] {
  return options.includes(value) ? (value as T[number]) : fallback;
}

// ---------------------------------------------------------------------------
// Helpers shared by the editor and renderer
// ---------------------------------------------------------------------------

// The blocks a given mode actually renders: "single" shows only the first
// block; "split" and "overlay" show both.
export function visibleBlocks(section: ProjectSectionData): SectionBlock[] {
  return section.layout.mode === "single"
    ? section.blocks.slice(0, 1)
    : section.blocks.slice(0, 2);
}

export function extractPlainText(content: JSONContent | undefined): string {
  if (!content) return "";
  const parts: string[] = [];
  const walk = (node: JSONContent) => {
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
    }
    node.content?.forEach(walk);
  };
  walk(content);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

// Deep clone with fresh ids — for the editor's "duplicate section" action.
// Fresh ids keep React keys and video-player DOM ids unique.
export function cloneSection(section: ProjectSectionData): ProjectSectionData {
  const clone: ProjectSectionData = JSON.parse(JSON.stringify(section));
  clone.id = crypto.randomUUID();
  clone.blocks = clone.blocks.map((block) => ({
    ...block,
    id: crypto.randomUUID(),
  }));
  return clone;
}

export function isSectionEmpty(section: ProjectSectionData): boolean {
  return section.blocks.every((block) =>
    block.kind === "media"
      ? block.items.length === 0
      : extractPlainText(block.richText) === "",
  );
}

export interface Project {
  slug: string;
  title: string;
  published: boolean;
  eventDate: Timestamp;
  thumbnail: ProjectThumbnail | null;
  sections: ProjectSectionData[];
  // Page background hex; null/absent = the site's default black.
  pageBackground?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
  // Denormalized snapshot of users/{createdBy}.name at creation time.
  // Published projects are publicly readable but users/{uid} isn't (see
  // firestore.rules), so a visitor's page render can't resolve createdBy to
  // a name on its own.
  createdByName: string;
}
