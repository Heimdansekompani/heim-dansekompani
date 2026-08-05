import type { ProjectListItem } from "@/lib/projects";
import { ProjectCard } from "@/components/project-card";
import { Reveal } from "@/components/reveal";

export function ProjectGrid({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {projects.map((project, index) => (
        // Staggered by index rather than actual grid row/column (which
        // shifts with the responsive column count) — capped so a long list
        // doesn't leave the last cards waiting a long time to start.
        <Reveal key={project.slug} delayMs={Math.min(index * 75, 300)}>
          <ProjectCard
            slug={project.slug}
            title={project.title}
            thumbnail={project.thumbnail}
            formattedDate={new Date(
              project.eventDateMillis,
            ).toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </Reveal>
      ))}
    </div>
  );
}
