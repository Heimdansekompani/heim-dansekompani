"use client";

import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";
import { RenderRichText } from "@/lib/render-rich-text";
import { SectionMedia } from "@/components/section-media";
import type {
  MediaBlock,
  ProjectSectionData,
  SectionBlock,
  TextBlock,
  VerticalAlign,
} from "@/lib/project";

/**
 * Renders one section in one of three modes: a single block ("single"), two
 * blocks side by side ("split", optionally overlapping), or text on top of
 * full-width media ("overlay").
 *
 * All responsive behavior uses container variants (@2xl ≈ the old sm
 * breakpoint) against the @container root in SectionList — not viewport
 * media queries — so the admin preview's 375px-wide pane genuinely reflows
 * to the phone layout.
 *
 * Widths are passed as CSS variables rather than Tailwind arbitrary-value
 * classes so every width option shares the same static class strings.
 */

// Class maps must be static literal strings for the Tailwind JIT.
const ITEMS_VALIGN: Record<VerticalAlign, string> = {
  start: "@2xl:items-start",
  center: "@2xl:items-center",
  end: "@2xl:items-end",
};

const SELF_VALIGN: Record<VerticalAlign, string> = {
  start: "@2xl:self-start",
  center: "@2xl:self-center",
  end: "@2xl:self-end",
};

const OVERLAY_ITEMS: Record<VerticalAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
};

const OVERLAY_JUSTIFY: Record<"left" | "center" | "right", string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

interface ProjectSectionProps {
  section: ProjectSectionData;
  // Namespaces video-player DOM ids so the preview can render the same
  // section as the page behind it without id collisions.
  idPrefix?: string;
}

export function ProjectSection({ section, idPrefix = "" }: ProjectSectionProps) {
  const { layout, blocks } = section;

  // A "full" section drops the page column's padding so media can touch the
  // viewport edges — but text pressed against the edge is unreadable, so
  // text blocks bring their own padding there (matching the overlay layer's
  // p-6/@2xl:p-12).
  const textPad =
    section.style.width === "full" ? "px-6 @2xl:px-12" : undefined;

  const blockView = (block: SectionBlock, sizes?: string) =>
    block.kind === "media" ? (
      <SectionMedia
        block={block}
        playerId={`${idPrefix}${section.id}-${block.id}`}
        sizes={sizes}
      />
    ) : (
      <TextBlockView block={block} className={textPad} />
    );

  // Split columns only: media honors its own widthPercent/align inside the
  // column, like text blocks do. "single"/"overlay" size the whole block via
  // layout.blockWidthPercent — applying both would compound the two widths.
  const splitBlockView = (block: SectionBlock, sizes?: string) => {
    if (block.kind !== "media" || block.widthPercent === 100) {
      return blockView(block, sizes);
    }
    return (
      <div
        style={{ "--media-w": `${block.widthPercent}%` } as CSSProperties}
        className={cn(
          "w-full @2xl:max-w-[var(--media-w)]",
          block.align === "center" && "@2xl:mx-auto",
          block.align === "right" && "@2xl:ml-auto",
        )}
      >
        {blockView(block, sizes)}
      </div>
    );
  };

  if (layout.mode === "overlay") {
    const media = blocks.find(isMediaBlock);
    const text = blocks.find(isTextBlock);
    if (!media || media.items.length === 0) {
      return text ? blockView(text) : null;
    }
    return (
      // Same width/placement treatment as "single": full width when
      // stacked, blockWidthPercent + blockAlign on large screens.
      <div
        style={{ "--w": `${layout.blockWidthPercent}%` } as CSSProperties}
        className={cn(
          "relative w-full @2xl:w-[var(--w)]",
          layout.blockAlign === "center" && "@2xl:mx-auto",
          layout.blockAlign === "right" && "@2xl:ml-auto",
        )}
      >
        <SectionMedia
          block={media}
          playerId={`${idPrefix}${section.id}-${media.id}`}
          sizes="100vw"
        />
        {text && (
          <div
            className={cn(
              // pointer-events split: the layer must not block a player
              // video's controls, but the text itself stays interactive
              // (links).
              "pointer-events-none absolute inset-0 z-10 p-6 @2xl:p-12",
              // "stack" hides the on-media text when narrow — the media
              // shrinks faster than the text, which would dominate it —
              // and shows the stacked copy below instead.
              layout.overlayNarrow === "stack" ? "hidden @2xl:flex" : "flex",
              OVERLAY_ITEMS[layout.verticalAlign],
              OVERLAY_JUSTIFY[layout.overlayAlign],
            )}
          >
            <div
              style={{ "--text-w": `${text.widthPercent}%` } as CSSProperties}
              className="pointer-events-auto w-full @2xl:max-w-[var(--text-w)]"
            >
              <RenderRichText content={text.richText} />
            </div>
          </div>
        )}
        {text && layout.overlayNarrow === "stack" && (
          <div className={cn("mt-4 @2xl:hidden", textPad)}>
            <RenderRichText content={text.richText} />
          </div>
        )}
      </div>
    );
  }

  if (layout.mode === "single" || blocks.length < 2) {
    const block = blocks[0];
    if (!block) return null;
    // A lone text block sizes/positions itself (Tekstbredde + Plassering on
    // the block) — the section-level width only applies to media, matching
    // which controls the editor exposes.
    if (block.kind === "text") {
      return <TextBlockView block={block} className={textPad} />;
    }
    return (
      <div
        style={{ "--w": `${layout.blockWidthPercent}%` } as CSSProperties}
        className={cn(
          "w-full @2xl:w-[var(--w)]",
          layout.blockAlign === "center" && "@2xl:mx-auto",
          layout.blockAlign === "right" && "@2xl:ml-auto",
        )}
      >
        {blockView(block)}
      </div>
    );
  }

  const [first, second] = blocks;

  if (layout.overlap === "half") {
    // Both children share the single grid cell at @2xl; the second block is
    // pulled sideways with a percent-margin calc so its center lands exactly
    // on the first block's inner edge. Percent margins resolve against the
    // grid container, so the math is exact; max(0%, …) keeps a too-wide
    // second block from overflowing the page. Below @2xl this degrades to
    // the plain stacked flow.
    // A floating media block at 100% would cover the whole row, so 100 is
    // treated as "unset" and falls back to the historical 50.
    const overlapWidth = isTextBlock(second)
      ? second.widthPercent
      : second.widthPercent === 100
        ? 50
        : second.widthPercent;
    return (
      <div
        style={
          {
            "--split": `${layout.splitPercent}%`,
            "--overlap-w": `${overlapWidth}%`,
          } as CSSProperties
        }
        className="flex flex-col gap-6 @2xl:grid @2xl:grid-cols-1"
      >
        <div
          className={cn(
            "w-full @2xl:col-start-1 @2xl:row-start-1 @2xl:w-[var(--split)]",
            layout.mirror && "@2xl:justify-self-end",
            layout.reverseStack && "order-last @2xl:order-none",
          )}
        >
          {blockView(first)}
        </div>
        <div
          className={cn(
            "w-full @2xl:col-start-1 @2xl:row-start-1 @2xl:z-10 @2xl:w-[var(--overlap-w)]",
            SELF_VALIGN[layout.verticalAlign],
            layout.mirror
              ? "@2xl:ml-auto @2xl:mr-[max(0%,calc(var(--split)_-_var(--overlap-w)/2))]"
              : "@2xl:ml-[max(0%,calc(var(--split)_-_var(--overlap-w)/2))]",
          )}
        >
          {isTextBlock(second) ? (
            <TextBlockView
              block={second}
              constrainWidth={false}
              className={textPad}
            />
          ) : (
            blockView(second)
          )}
        </div>
      </div>
    );
  }

  // Plain split. Desktop side follows array order (blocks[0] left); when
  // stacked, reverseStack lets blocks[1] render on top via flex order
  // instead of swapping DOM order.
  return (
    <div
      style={{ "--split": `${layout.splitPercent}%` } as CSSProperties}
      className={cn(
        "flex flex-col gap-6 @2xl:flex-row @2xl:gap-10",
        ITEMS_VALIGN[layout.verticalAlign],
      )}
    >
      <div
        className={cn(
          "w-full shrink-0 @2xl:w-[var(--split)]",
          layout.reverseStack && "order-last @2xl:order-none",
        )}
      >
        {splitBlockView(first)}
      </div>
      <div className="min-w-0 w-full flex-1">{splitBlockView(second)}</div>
    </div>
  );
}

function TextBlockView({
  block,
  constrainWidth = true,
  className,
}: {
  block: TextBlock;
  // The overlap and overlay layouts size/position the text's wrapper
  // themselves — applying widthPercent again inside would compound the two
  // (50% of a 50% wrapper = 25%).
  constrainWidth?: boolean;
  // Extra classes on the wrapper — used for full-bleed sections' text
  // padding.
  className?: string;
}) {
  if (!constrainWidth) {
    if (!className) return <RenderRichText content={block.richText} />;
    return (
      <div className={className}>
        <RenderRichText content={block.richText} />
      </div>
    );
  }
  return (
    <div
      style={{ "--text-w": `${block.widthPercent}%` } as CSSProperties}
      className={cn(
        "w-full @2xl:max-w-[var(--text-w)]",
        block.align === "center" && "@2xl:mx-auto",
        block.align === "right" && "@2xl:ml-auto",
        className,
      )}
    >
      <RenderRichText content={block.richText} />
    </div>
  );
}

function isMediaBlock(block: SectionBlock): block is MediaBlock {
  return block.kind === "media";
}

function isTextBlock(block: SectionBlock): block is TextBlock {
  return block.kind === "text";
}
