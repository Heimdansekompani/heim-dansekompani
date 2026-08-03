"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Monitor, Smartphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SectionList } from "@/components/section-list";
import type { ProjectSectionData } from "@/lib/project";
import { LINK_BUTTON_CLASS } from "@/lib/rich-text-constants";
import { cn } from "@/lib/utils";

type PreviewMode = "desktop" | "mobile";

interface SectionPreviewProps {
  // Current *unsaved* editor state — the preview never touches Firestore.
  sections: ProjectSectionData[];
  pageBackground: string | null;
  title: string;
  subtitle?: string;
  // Typography wrapper passed through to SectionList, so the preview
  // matches the hosting public page exactly (the om page sets one).
  contentClassName?: string;
  // Mirrors app/prosjekter/[slug]/page.tsx's registrationOpen check — the
  // "Påmelding" button only ever shows there when this is true, so the
  // preview has to be told rather than deriving it itself.
  registrationOpen?: boolean;
  pameldingHref?: string;
  onClose: () => void;
}

/**
 * Full-screen preview of how the sections will render on the public page.
 * The phone toggle just narrows the wrapper to 375px — the section renderer
 * is built on container queries, so the content genuinely reflows to the
 * phone layout rather than being scaled down.
 */
export function SectionPreview({
  sections,
  pageBackground,
  title,
  subtitle,
  contentClassName,
  registrationOpen,
  pameldingHref,
  onClose,
}: SectionPreviewProps) {
  const [mode, setMode] = useState<PreviewMode>("desktop");

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    // The overlay isn't a route, so without this the browser's back button
    // would navigate away from the editor and lose unsaved work. Push a
    // history entry for the overlay and treat popstate as "close preview".
    window.history.pushState({ sectionPreview: true }, "");
    const handlePopState = () => onCloseRef.current();
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Every close path (Lukk button, Escape, browser back) goes through
  // history.back() so the pushed entry is always consumed exactly once.
  const requestClose = useCallback(() => {
    window.history.back();
  }, []);

  useEffect(() => {
    // Scroll-lock the page behind the overlay and close on Escape.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [requestClose]);

  return (
    // z-[60] sits above the site navbar (z-50).
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-white/15 bg-black/90 px-4 py-3 backdrop-blur">
        <p className="font-serif text-sm text-white/70">
          Forhåndsvisning — vises slik siden blir, uten å lagre
        </p>
        <div className="flex items-center gap-2">
          <ToggleGroup
            variant="outline"
            size="sm"
            multiple={false}
            value={[mode]}
            onValueChange={(value) => {
              const next = value[0] as PreviewMode | undefined;
              if (next) setMode(next);
            }}
          >
            <ToggleGroupItem value="desktop" aria-label="Desktop">
              <Monitor className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="mobile" aria-label="Mobil">
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={requestClose}
            aria-label="Lukk forhåndsvisning"
          >
            <X className="h-4 w-4" />
            Lukk
          </Button>
        </div>
      </div>

      <div
        className={cn(
          mode === "mobile" && "mx-auto w-[375px] border-x border-white/15",
        )}
      >
        <div
          style={
            pageBackground ? { backgroundColor: pageBackground } : undefined
          }
          className="min-h-dvh pb-20"
        >
          <div className="mx-auto max-w-6xl px-6 pt-20">
            <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 font-serif text-sm text-white/50">
                {subtitle}
              </p>
            )}
            {registrationOpen && pameldingHref && (
              <Link
                href={pameldingHref}
                className={`mt-4 ${LINK_BUTTON_CLASS.button}`}
              >
                Påmelding
              </Link>
            )}
          </div>
          <div className="mt-12">
            <SectionList
              sections={sections}
              idPrefix="preview-"
              className={contentClassName}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
