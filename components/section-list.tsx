"use client";

import { cn } from "@/lib/utils";
import { ProjectSection } from "@/components/project-section";
import type { ProjectSectionData } from "@/lib/project";

interface SectionListProps {
  sections: ProjectSectionData[];
  // Namespaces video-player DOM ids (see ProjectSection).
  idPrefix?: string;
  // Typography for authored content, applied inside the @container root so
  // container variants in it (e.g. @2xl:text-lg) resolve correctly.
  className?: string;
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
              index > 0 && !section.style.flushTop && "mt-16",
              // Breathing room only when a colored band exists.
              section.style.background && "py-8 @2xl:py-12",
            )}
          >
            <div
              className={cn(!section.style.fullBleed && "mx-auto max-w-6xl px-6")}
            >
              <ProjectSection section={section} idPrefix={idPrefix} />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
