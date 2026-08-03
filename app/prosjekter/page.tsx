import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import { isStaffRequest } from "@/lib/server-auth";
import { ProjectCard } from "@/components/project-card";
import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Prosjekter | Heim Dansekompani",
};

// Only what the listing actually renders — deliberately narrower than
// Project so the cache entry doesn't carry every project's full sections/
// performanceDates, and eventDate is stored as millis (a plain number)
// rather than a Firestore Timestamp instance, since unstable_cache
// persists its return value through Vercel's Data Cache (an external
// store), which would otherwise silently strip Timestamp down to a
// method-less {seconds, nanoseconds} object.
interface ProjectListItem {
  slug: string;
  title: string;
  thumbnail: Project["thumbnail"];
  eventDateMillis: number;
}

// Content is managed through the admin CMS, so it can't be cached forever —
// but it also doesn't need a fresh Firestore round-trip on every visit. The
// admin UI calls /api/revalidate right after a save/publish-toggle/delete
// (see components/admin/project-form.tsx and app/admin/prosjekter/page.tsx),
// which invalidates this immediately; the 5-minute window below is just a
// fallback in case that call is ever missed.
const getPublishedProjects = unstable_cache(
  async (): Promise<ProjectListItem[]> => {
    const projectsQuery = query(
      collection(db, "projects"),
      where("published", "==", true),
    );
    const snapshot = await getDocs(projectsQuery);
    return snapshot.docs.map((document) => {
      const project = document.data() as Project;
      return {
        slug: project.slug,
        title: project.title,
        thumbnail: project.thumbnail,
        eventDateMillis: project.eventDate.toMillis(),
      };
    });
  },
  ["published-projects"],
  { tags: ["projects"], revalidate: 300 },
);

function ProjectGrid({ projects }: { projects: ProjectListItem[] }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.slug}
          slug={project.slug}
          title={project.title}
          thumbnail={project.thumbnail}
          formattedDate={new Date(project.eventDateMillis).toLocaleDateString(
            "nb-NO",
            { day: "numeric", month: "long", year: "numeric" },
          )}
        />
      ))}
    </div>
  );
}

// A plain helper (not a component) so the impure Date.now() read doesn't
// trip React's component-purity lint rule — it's exactly right to check
// "now" fresh on every request.
function splitByEventDate(projects: ProjectListItem[]) {
  const now = Date.now();

  const upcoming = projects
    .filter((project) => project.eventDateMillis >= now)
    .sort((a, b) => a.eventDateMillis - b.eventDateMillis);

  const past = projects
    .filter((project) => project.eventDateMillis < now)
    .sort((a, b) => b.eventDateMillis - a.eventDateMillis);

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
