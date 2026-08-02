import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { PersonEntry } from "@/lib/person";
import { PersonCard } from "@/components/person-card";

export const metadata: Metadata = {
  title: "Personer | Heim Dansekompani",
};

// Content is managed through the admin CMS, so this must never be statically
// cached at build time.
export const dynamic = "force-dynamic";

async function getPeople(): Promise<PersonEntry[]> {
  const snapshot = await getDoc(doc(db, "settings", "personer"));
  const data = snapshot.data();
  return Array.isArray(data?.people) ? data.people : [];
}

export default async function PersonerPage() {
  const people = await getPeople();

  return (
    <div className="mx-auto max-w-4xl px-6 py-20 sm:py-28">
      <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
        Personer
      </h1>
      <div className="mt-12 flex flex-col gap-16">
        {people.map((person) => (
          <PersonCard key={person.id} person={person} />
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
