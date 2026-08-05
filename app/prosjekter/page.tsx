import type { Metadata } from "next";

import { getPublishedProjects, splitByEventDate } from "@/lib/projects";
import { isStaffRequest } from "@/lib/server-auth";
import { ProjectGrid } from "@/components/project-grid";
import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Prosjekter | Heim Dansekompani",
};

export default async function ProsjekterPage() {
  if (!(await isStaffRequest())) return <UnderConstruction />;

  const projects = await getPublishedProjects();
  const { upcoming, past } = splitByEventDate(projects);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
        Prosjekter
      </h1>

      {projects.length === 0 && (
        <p className="mt-8 font-serif text-base leading-relaxed text-white/70 sm:text-lg">
          Kompaniets prosjekter presenteres her fortløpende. Kommer snart.
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-xl tracking-wide">Kommende</h2>
          <ProjectGrid projects={upcoming} />
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-16">
          <h2 className="font-serif text-xl tracking-wide">Tidligere</h2>
          <ProjectGrid projects={past} />
        </section>
      )}
    </div>
  );
}
