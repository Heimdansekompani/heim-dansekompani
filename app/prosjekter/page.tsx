import type { Metadata } from "next";

import { getPublishedProjects, splitByEventDate } from "@/lib/projects";
import { AdminEditLink } from "@/components/admin-edit-link";
import { ProjectListing } from "@/components/project-listing";

export const metadata: Metadata = {
  title: "Prosjekter | Heim Dansekompani",
};

export default async function ProsjekterPage() {
  const projects = await getPublishedProjects();
  const { upcoming, past } = splitByEventDate(projects);

  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <div className="flex items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
          Prosjekter
        </h1>
        <AdminEditLink
          href="/admin/prosjekter"
          label="Administrer prosjekter"
        />
      </div>

      <ProjectListing upcoming={upcoming} past={past} />
    </div>
  );
}
