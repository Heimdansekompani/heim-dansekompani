import { cache } from "react";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import Link from "next/link";
import { notFound } from "next/navigation";
import { doc, getDoc, type Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { toCacheSafe, fromCacheSafe } from "@/lib/firestore-cache";
import { normalizeSections, type Project } from "@/lib/project";
import {
  normalizePerformanceDates,
  type PerformanceDate,
} from "@/lib/registration";
import { isValidHexColor, LINK_BUTTON_CLASS } from "@/lib/rich-text-constants";
import { AdminEditLink } from "@/components/admin-edit-link";
import { SectionList } from "@/components/section-list";

// A plain helper (not a component) so the impure Date.now() read doesn't
// trip React's component-purity lint rule — see app/prosjekter/page.tsx for
// the same pattern.
function hasUpcomingDate(dates: PerformanceDate[]): boolean {
  const now = Date.now();
  return dates.some((date) => date.startsAt.toMillis() > now);
}

function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Content is managed through the admin CMS, so it can't be cached forever —
// but it also doesn't need a fresh Firestore round-trip on every visit. The
// admin UI calls /api/revalidate right after a save/publish-toggle/delete
// (see components/admin/project-form.tsx and app/admin/prosjekter/page.tsx),
// which invalidates this immediately; the 5-minute window below is just a
// fallback in case that call is ever missed.
//
// toCacheSafe/fromCacheSafe round-trip every Timestamp field (eventDate,
// createdAt, updatedAt, and each performanceDates entry's startsAt) through
// a JSON-safe marker, since unstable_cache persists its return value
// through Vercel's Data Cache — an external store that would otherwise
// silently strip Timestamp instances down to method-less plain objects.
const getProjectCached = unstable_cache(
  async (slug: string): Promise<Project | null> => {
    const snapshot = await getDoc(doc(db, "projects", slug));
    if (!snapshot.exists()) return null;

    const project = snapshot.data() as Project;
    return project.published ? toCacheSafe(project) : null;
  },
  ["project"],
  { tags: ["projects"], revalidate: 300 },
);

// Deduped per request — generateMetadata and the page component both need
// this.
const getProject = cache(async (slug: string): Promise<Project | null> => {
  const cached = await getProjectCached(slug);
  return cached ? fromCacheSafe(cached) : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  return {
    title: project
      ? `${project.title} | Heim Dansekompani`
      : "Prosjekt | Heim Dansekompani",
  };
}

export default async function ProsjektPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const sections = normalizeSections(project.sections);
  const pageBackground = isValidHexColor(project.pageBackground)
    ? project.pageBackground
    : null;
  const performanceDates = normalizePerformanceDates(project.performanceDates);
  const registrationOpen =
    project.registrationEnabled === true && hasUpcomingDate(performanceDates);

  return (
    // -mt-20/pt-20 pulls the page background up under the fixed h-20 navbar
    // so its bg-black/80 backdrop-blur tints the page color instead of
    // sitting on a black strip.
    <div
      style={
        pageBackground ? { backgroundColor: pageBackground } : undefined
      }
      className="-mt-20 pt-20"
    >
      <div className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl underline underline-offset-8">
                {project.title}
              </h1>
              <p className="mt-2 font-serif text-sm text-white/50">
                {formatDate(project.eventDate)}
              </p>
              {registrationOpen && (
                <Link
                  href={`/prosjekter/${project.slug}/pamelding`}
                  className={`mt-4 ${LINK_BUTTON_CLASS.button}`}
                >
                  Påmelding
                </Link>
              )}
            </div>
            <AdminEditLink
              href={`/admin/prosjekter/${project.slug}`}
              label="Rediger prosjekt"
            />
          </div>
        </div>
        <div className="mt-12">
          <SectionList sections={sections} animate />
        </div>
        <div className="mx-auto mt-16 max-w-6xl px-6">
          <div className="border-t border-white/10 pt-6 font-serif text-xs text-white/40">
            <p>
              {project.createdByName
                ? `Publisert av ${project.createdByName} — ${formatDate(project.createdAt)}`
                : `Publisert ${formatDate(project.createdAt)}`}
            </p>
            {project.updatedAt.toMillis() !== project.createdAt.toMillis() && (
              <p className="mt-1">
                Sist redigert {formatDate(project.updatedAt)}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
