import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { doc, getDoc, type Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeSections, type Project } from "@/lib/project";
import { isValidHexColor } from "@/lib/rich-text-constants";
import { EditProjectLink } from "@/components/edit-project-link";
import { SectionList } from "@/components/section-list";

export const dynamic = "force-dynamic";

function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Deduped per request — generateMetadata and the page component both need
// this, and the Firestore SDK's reads aren't covered by Next's fetch cache.
const getProject = cache(async (slug: string): Promise<Project | null> => {
  const snapshot = await getDoc(doc(db, "projects", slug));
  if (!snapshot.exists()) return null;

  const project = snapshot.data() as Project;
  return project.published ? project : null;
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
            </div>
            <EditProjectLink slug={project.slug} />
          </div>
        </div>
        <div className="mt-12">
          <SectionList sections={sections} />
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
