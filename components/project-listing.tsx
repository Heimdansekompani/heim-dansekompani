"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";

import { isEditorOrAbove } from "@/contexts/current-admin-context";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import { splitByEventDate, type ProjectListItem } from "@/lib/projects";
import { ProjectGrid } from "@/components/project-grid";

type ListedProject = ProjectListItem & { isDraft?: boolean };

const EMPTY_DRAFTS = { upcoming: [], past: [] };

// The published lists are rendered (and cached) server-side, where reads
// are anonymous — Firestore rules hide unpublished projects from those, so
// drafts can only be fetched here in the browser, with the signed-in
// editor's credentials. Anonymous visitors never trigger the query.
function useDraftProjects() {
  const { role } = useCurrentAdmin();
  const isStaff = isEditorOrAbove(role);
  const [drafts, setDrafts] = useState<{
    upcoming: ListedProject[];
    past: ListedProject[];
  }>(EMPTY_DRAFTS);

  useEffect(() => {
    if (!isStaff) return;
    let cancelled = false;

    // Fetches every project and filters client-side rather than querying
    // published == false, so older docs missing the field still show up.
    getDocs(collection(db, "projects"))
      .then((snapshot) => {
        if (cancelled) return;
        // Split here (not during render) against the same boundary the
        // server used, so a draft lands in the section it'll appear in
        // once published.
        setDrafts(
          splitByEventDate(
            snapshot.docs
              .map((document) => document.data() as Project)
              .filter((project) => !project.published)
              .map((project) => ({
                slug: project.slug,
                title: project.title,
                thumbnail: project.thumbnail,
                eventDateMillis: project.eventDate.toMillis(),
                isDraft: true,
              })),
          ),
        );
      })
      .catch(() => {
        // Drafts are a staff convenience — the published list still works.
      });

    return () => {
      cancelled = true;
    };
  }, [isStaff]);

  return isStaff ? drafts : EMPTY_DRAFTS;
}

export function ProjectListing({
  upcoming,
  past,
}: {
  upcoming: ProjectListItem[];
  past: ProjectListItem[];
}) {
  const drafts = useDraftProjects();
  const allUpcoming: ListedProject[] = [...upcoming, ...drafts.upcoming].sort(
    (a, b) => a.eventDateMillis - b.eventDateMillis,
  );
  const allPast: ListedProject[] = [...past, ...drafts.past].sort(
    (a, b) => b.eventDateMillis - a.eventDateMillis,
  );

  return (
    <>
      {allUpcoming.length === 0 && allPast.length === 0 && (
        <p className="mt-8 font-serif text-base leading-relaxed text-white/70 sm:text-lg">
          Kompaniets prosjekter presenteres her fortløpende. Kommer snart.
        </p>
      )}

      {allUpcoming.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl tracking-wide">Kommende</h2>
          <ProjectGrid projects={allUpcoming} />
        </section>
      )}

      {allPast.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-xl tracking-wide">Tidligere</h2>
          <ProjectGrid projects={allPast} />
        </section>
      )}
    </>
  );
}
