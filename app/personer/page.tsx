import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PersonEntry } from "@/lib/person";
import { PersonCard } from "@/components/person-card";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = {
  title: "Personer | Heim Dansekompani",
};

// Content is managed through the admin CMS, so it can't be cached forever —
// but it also doesn't need a fresh Firestore round-trip on every visit. The
// admin editor calls /api/revalidate right after a save (see
// app/admin/personer/page.tsx), which invalidates this immediately; the
// 5-minute window below is just a fallback in case that call is ever
// missed. This page has no cookie-based gate (unlike om/prosjekter), so
// without force-dynamic it renders statically between revalidations.
const getPeople = unstable_cache(
  async (): Promise<PersonEntry[]> => {
    const snapshot = await getDoc(doc(db, "settings", "personer"));
    const data = snapshot.data();
    return Array.isArray(data?.people) ? data.people : [];
  },
  ["personer-content"],
  { tags: ["personer-content"], revalidate: 300 },
);

export default async function PersonerPage() {
  const people = await getPeople();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
      <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
        Personer
      </h1>
      <div className="mt-12 flex flex-col gap-16">
        {people.map((person, index) => (
          // Staggered the same way as ProjectGrid — capped so a long list
          // doesn't leave the last cards waiting a long time to start.
          <Reveal key={person.id} delayMs={Math.min(index * 75, 300)}>
            <PersonCard person={person} />
          </Reveal>
        ))}
        {people.length === 0 && (
          <p className="font-serif text-base leading-relaxed text-white/70 sm:text-lg">
            Kompaniets medlemmer presenteres her fortløpende.
          </p>
        )}
      </div>
    </div>
  );
}
