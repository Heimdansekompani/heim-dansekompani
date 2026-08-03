import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import {
  normalizePerformanceDates,
  type AttendanceDoc,
  type PerformanceDate,
} from "@/lib/registration";
import { RegistrationForm } from "@/components/registration-form";

export const dynamic = "force-dynamic";

// Deduped per request — generateMetadata and the page component both need
// this (same pattern as the project page).
const getProject = cache(async (slug: string): Promise<Project | null> => {
  const snapshot = await getDoc(doc(db, "projects", slug));
  if (!snapshot.exists()) return null;

  const project = snapshot.data() as Project;
  return project.published ? project : null;
});

// Plain helpers (not components) so the impure Date.now() read doesn't trip
// React's component-purity lint rule — see app/prosjekter/page.tsx.
function hasUpcomingDate(startsAtMillis: number[]): boolean {
  const now = Date.now();
  return startsAtMillis.some((millis) => millis > now);
}

function upcomingDates(dates: PerformanceDate[]): PerformanceDate[] {
  const now = Date.now();
  return dates.filter((date) => date.startsAt.toMillis() > now);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);

  return {
    title: project
      ? `Påmelding – ${project.title} | Heim Dansekompani`
      : "Påmelding | Heim Dansekompani",
  };
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) notFound();

  const allDates = normalizePerformanceDates(project.performanceDates);
  const isOpen =
    project.registrationEnabled === true &&
    hasUpcomingDate(allDates.map((date) => date.startsAt.toMillis()));

  if (!isOpen) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
        <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
          Påmelding
        </h1>
        <p className="mt-4 font-serif text-base leading-relaxed text-white/70">
          Påmelding er ikke åpen for dette prosjektet.
        </p>
        <Link
          href={`/prosjekter/${slug}`}
          className="mt-8 inline-block text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          ← Tilbake til prosjektet
        </Link>
      </div>
    );
  }

  const upcoming = upcomingDates(allDates);

  const attendanceSnapshot = await getDocs(
    collection(db, "projects", slug, "attendance"),
  );
  const takenByDateId: Record<string, number> = {};
  for (const docSnap of attendanceSnapshot.docs) {
    takenByDateId[docSnap.id] = (docSnap.data() as AttendanceDoc).taken;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
      <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
        Påmelding
      </h1>
      <p className="mt-2 font-serif text-base text-white/70">
        {project.title}
      </p>

      <div className="mt-12">
        <RegistrationForm
          slug={slug}
          projectTitle={project.title}
          dates={upcoming.map((date) => ({
            id: date.id,
            startsAtMillis: date.startsAt.toMillis(),
            location: date.location,
            capacity: date.capacity,
            price: date.price,
          }))}
          initialTakenByDateId={takenByDateId}
        />
      </div>

      <Link
        href={`/prosjekter/${slug}`}
        className="mt-12 inline-block text-sm text-white/50 underline-offset-4 hover:text-white hover:underline"
      >
        ← Tilbake til prosjektet
      </Link>
    </div>
  );
}
