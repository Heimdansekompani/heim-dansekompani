import type { Metadata } from "next";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import { isStaffRequest } from "@/lib/server-auth";
import { ProjectCard } from "@/components/project-card";
import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Prosjekter | Heim Dansekompani",
};

// Content is managed through the admin CMS, so this must never be statically
// cached at build time.
export const dynamic = "force-dynamic";

async function getPublishedProjects(): Promise<Project[]> {
  const projectsQuery = query(
    collection(db, "projects"),
    where("published", "==", true),
  );
  const snapshot = await getDocs(projectsQuery);
  return snapshot.docs.map((document) => document.data() as Project);
}

function ProjectGrid({ projects }: { projects: Project[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.slug}
          slug={project.slug}
          title={project.title}
          thumbnail={project.thumbnail}
          formattedDate={project.eventDate
            .toDate()
            .toLocaleDateString("nb-NO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
        />
      ))}
    </div>
  );
}

// A plain helper (not a component) so the impure Date.now() read doesn't
// trip React's component-purity lint rule — it's exactly right for a
// force-dynamic page to check "now" fresh on every request.
function splitByEventDate(projects: Project[]) {
  const now = Date.now();

  const upcoming = projects
    .filter((project) => project.eventDate.toMillis() >= now)
    .sort((a, b) => a.eventDate.toMillis() - b.eventDate.toMillis());

  const past = projects
    .filter((project) => project.eventDate.toMillis() < now)
    .sort((a, b) => b.eventDate.toMillis() - a.eventDate.toMillis());

  return { upcoming, past };
}

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
