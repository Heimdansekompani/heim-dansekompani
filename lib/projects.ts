import { unstable_cache } from "next/cache";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";

// Only what listings actually render — deliberately narrower than Project
// so the cache entry doesn't carry every project's full sections/
// performanceDates, and eventDate is stored as millis (a plain number)
// rather than a Firestore Timestamp instance, since unstable_cache
// persists its return value through Vercel's Data Cache (an external
// store), which would otherwise silently strip Timestamp down to a
// method-less {seconds, nanoseconds} object.
export interface ProjectListItem {
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
// fallback in case that call is ever missed. Shared by app/prosjekter and
// the homepage's upcoming-projects preview.
export const getPublishedProjects = unstable_cache(
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

// A plain function (not a React component) so the impure Date.now() read
// doesn't trip React's component-purity lint rule — it's exactly right to
// check "now" fresh on every request.
export function splitByEventDate<T extends ProjectListItem>(projects: T[]) {
  const now = Date.now();

  const upcoming = projects
    .filter((project) => project.eventDateMillis >= now)
    .sort((a, b) => a.eventDateMillis - b.eventDateMillis);

  const past = projects
    .filter((project) => project.eventDateMillis < now)
    .sort((a, b) => b.eventDateMillis - a.eventDateMillis);

  return { upcoming, past };
}
