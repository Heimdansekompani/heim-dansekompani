"use client";

import { cn } from "@/lib/utils";
import { ProjectSection } from "@/components/project-section";
import { Reveal } from "@/components/reveal";
import type {
  ProjectSectionData,
  SectionWidth,
  TopGap,
} from "@/lib/project";

const WIDTH_CLASS: Record<SectionWidth, string | null> = {
  standard: "mx-auto max-w-6xl px-6",
  // A real 90% of the container at every size (labeled «90 %» in the
  // editor) — no fixed cap, so it stays visibly between "standard" and
  // "full" on wide screens instead of converging with either.
  wide: "mx-auto w-[90%]",
  full: null,
};

const TOP_GAP_CLASS: Record<TopGap, string | null> = {
  standard: "mt-16",
  small: "mt-8",
  none: null,
};

interface SectionListProps {
  sections: ProjectSectionData[];
  // Namespaces video-player DOM ids (see ProjectSection).
  idPrefix?: string;
  // Typography for authored content, applied inside the @container root so
  // container variants in it (e.g. @2xl:text-lg) resolve correctly.
  className?: string;
  // Fades each section in top-to-bottom as it scrolls into view. Off by
  // default so the admin preview (components/admin/section-preview.tsx)
  // doesn't replay the animation on every edit — only the public pages
  // (app/om, app/prosjekter/[slug]) opt in.
  animate?: boolean;
}

/**
 * Owns each section's outer wrapper: the page hands over its full width and
 * this component re-applies the content column (max-w-6xl px-6) per section —
 * which is what lets a section's background band span the whole viewport, a
 * full-bleed section skip the column entirely (no 100vw negative-margin
 * hacks, so no scrollbar-width overflow), and a flush section drop the gap
 * to its predecessor.
 *
 * The root is the @container that all section-tree container variants
 * (@2xl:*) resolve against — full viewport width on public pages, 375px in
 * the admin preview's phone mode.
 */
export function SectionList({
  sections,
  idPrefix = "",
  className,
  animate = false,
}: SectionListProps) {
  return (
    <div className="@container">
      <div className={className}>
        {sections.map((section, index) => (
          <section
            key={section.id}
            style={
              section.style.background
                ? { backgroundColor: section.style.background }
                : undefined
            }
            className={cn(
              index > 0 && TOP_GAP_CLASS[section.style.topGap],
              // Breathing room only when a colored band exists.
              section.style.background && "py-8 @2xl:py-12",
            )}
          >
            <div className={cn(WIDTH_CLASS[section.style.width])}>
              {animate ? (
                <Reveal>
                  <ProjectSection section={section} idPrefix={idPrefix} />
                </Reveal>
              ) : (
                <ProjectSection section={section} idPrefix={idPrefix} />
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
