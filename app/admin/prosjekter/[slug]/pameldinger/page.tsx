"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import {
  formatPerformanceDate,
  normalizePerformanceDates,
  type AttendanceDoc,
  type PerformanceDate,
  type Registration,
} from "@/lib/registration";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface RegistrationRow extends Registration {
  id: string;
}

interface RegistrationsData {
  project: Project | null;
  registrations: RegistrationRow[];
  takenByDateId: Record<string, number>;
}

// A plain data-fetching function (not calling setState itself) so the
// effect below can chain its result through .then() — a setState call
// nested inside a .then callback is the pattern React's effect-purity lint
// rule expects; calling a function that sets state directly in an effect
// body is not (see the mount effect).
async function fetchRegistrationsData(slug: string): Promise<RegistrationsData> {
  const [projectSnap, registrationsSnap, attendanceSnap] = await Promise.all([
    getDoc(doc(db, "projects", slug)),
    getDocs(
      query(
        collection(db, "projects", slug, "registrations"),
        orderBy("createdAt", "asc"),
      ),
    ),
    getDocs(collection(db, "projects", slug, "attendance")),
  ]);

  const takenByDateId: Record<string, number> = {};
  for (const docSnap of attendanceSnap.docs) {
    takenByDateId[docSnap.id] = (docSnap.data() as AttendanceDoc).taken;
  }

  return {
    project: projectSnap.exists() ? (projectSnap.data() as Project) : null,
    registrations: registrationsSnap.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Registration),
    })),
    takenByDateId,
  };
}

export default function AdminRegistrationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [project, setProject] = useState<Project | null | undefined>(
    undefined,
  );
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [takenByDateId, setTakenByDateId] = useState<Record<string, number>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function applyData(data: RegistrationsData) {
    setProject(data.project);
    setRegistrations(data.registrations);
    setTakenByDateId(data.takenByDateId);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    fetchRegistrationsData(slug).then((data) => {
      if (!cancelled) applyData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  async function cancelRegistration(registration: RegistrationRow) {
    setError(null);
    setBusyId(registration.id);
    try {
      const registrationRef = doc(
        db,
        "projects",
        slug,
        "registrations",
        registration.id,
      );
      const counterRef = doc(
        db,
        "projects",
        slug,
        "attendance",
        registration.dateId,
      );
      await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        transaction.delete(registrationRef);
        if (counterSnap.exists()) {
          const taken = (counterSnap.data() as AttendanceDoc).taken;
          transaction.update(counterRef, {
            taken: Math.max(0, taken - registration.tickets),
          });
        }
      });
      applyData(await fetchRegistrationsData(slug));
    } catch {
      setError("Kunne ikke slette påmeldingen. Prøv igjen.");
    } finally {
      setBusyId(null);
    }
  }

  async function syncCounter(dateId: string, sum: number) {
    setError(null);
    setBusyId(dateId);
    try {
      await setDoc(doc(db, "projects", slug, "attendance", dateId), {
        taken: sum,
      });
      applyData(await fetchRegistrationsData(slug));
    } catch {
      setError("Kunne ikke synkronisere antallet. Prøv igjen.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading || project === undefined) {
    return <p className="font-serif text-sm text-white/50">Laster …</p>;
  }

  if (project === null) {
    return (
      <p className="font-serif text-sm text-white/50">Fant ikke prosjektet.</p>
    );
  }

  const dates = normalizePerformanceDates(project.performanceDates);
  const dateIds = new Set(dates.map((d) => d.id));
  const registrationsByDateId = new Map<string, RegistrationRow[]>();
  const orphaned: RegistrationRow[] = [];
  for (const registration of registrations) {
    if (dateIds.has(registration.dateId)) {
      const list = registrationsByDateId.get(registration.dateId) ?? [];
      list.push(registration);
      registrationsByDateId.set(registration.dateId, list);
    } else {
      orphaned.push(registration);
    }
  }

  return (
    <div>
      <Link
        href={`/admin/prosjekter/${slug}`}
        className="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
      >
        ← Tilbake til prosjektet
      </Link>
      <h1 className="mt-2 font-serif text-2xl tracking-wide">
        Påmeldinger – {project.title}
      </h1>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      <div className="mt-8 flex flex-col gap-8">
        {dates.map((date) => (
          <RegistrationSection
            key={date.id}
            date={date}
            registrations={registrationsByDateId.get(date.id) ?? []}
            taken={takenByDateId[date.id] ?? 0}
            busyId={busyId}
            onCancel={cancelRegistration}
            onSync={syncCounter}
          />
        ))}

        {orphaned.length > 0 && (
          <div>
            <h2 className="font-serif text-lg text-white/70">Slettet dato</h2>
            <p className="mt-1 text-xs text-white/50">
              Datoen disse påmeldingene gjaldt er fjernet fra prosjektet.
            </p>
            <RegistrationTable
              registrations={orphaned}
              busyId={busyId}
              onCancel={cancelRegistration}
            />
          </div>
        )}

        {dates.length === 0 && orphaned.length === 0 && (
          <p className="font-serif text-sm text-white/50">
            Ingen påmeldinger ennå.
          </p>
        )}
      </div>
    </div>
  );
}

function RegistrationSection({
  date,
  registrations,
  taken,
  busyId,
  onCancel,
  onSync,
}: {
  date: PerformanceDate;
  registrations: RegistrationRow[];
  taken: number;
  busyId: string | null;
  onCancel: (registration: RegistrationRow) => void;
  onSync: (dateId: string, sum: number) => void;
}) {
  const sum = registrations.reduce((total, r) => total + r.tickets, 0);
  const drifted = sum !== taken;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 pb-2">
        <div>
          <h2 className="font-serif text-lg">
            {formatPerformanceDate(date.startsAt)}
          </h2>
          <p className="text-xs text-white/50">{date.location}</p>
        </div>
        <p className="text-xs text-white/50">
          {taken} av {date.capacity} billetter reservert ({registrations.length}{" "}
          påmeldinger)
        </p>
      </div>

      {drifted && (
        <div className="mt-2 flex items-center justify-between gap-4 rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-2">
          <p className="text-xs text-amber-200">
            Summen av billetter ({sum}) stemmer ikke med det reserverte
            antallet ({taken}).
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busyId === date.id}
            onClick={() => onSync(date.id, sum)}
          >
            Synkroniser antall
          </Button>
        </div>
      )}

      {registrations.length === 0 ? (
        <p className="mt-3 font-serif text-sm text-white/50">
          Ingen påmeldinger ennå.
        </p>
      ) : (
        <RegistrationTable
          registrations={registrations}
          busyId={busyId}
          onCancel={onCancel}
        />
      )}
    </div>
  );
}

function RegistrationTable({
  registrations,
  busyId,
  onCancel,
}: {
  registrations: RegistrationRow[];
  busyId: string | null;
  onCancel: (registration: RegistrationRow) => void;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-max text-left text-sm">
        <thead>
          <tr className="text-xs text-white/50">
            <th className="pb-2 pr-4 font-normal">Navn</th>
            <th className="pb-2 pr-4 font-normal">E-post</th>
            <th className="pb-2 pr-4 font-normal">Antall</th>
            <th className="pb-2 pr-4 font-normal">Registrert</th>
            <th className="pb-2 font-normal" />
          </tr>
        </thead>
        <tbody>
          {registrations.map((registration) => (
            <tr key={registration.id} className="border-t border-white/10">
              <td className="py-2 pr-4">{registration.name}</td>
              <td className="py-2 pr-4">
                <a
                  href={`mailto:${registration.email}`}
                  className="underline-offset-4 hover:underline"
                >
                  {registration.email}
                </a>
              </td>
              <td className="py-2 pr-4">{registration.tickets}</td>
              <td className="py-2 pr-4 text-white/50">
                {registration.createdAt
                  .toDate()
                  .toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}
              </td>
              <td className="py-2">
                <AlertDialog>
                  <AlertDialogTrigger
                    render={
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busyId === registration.id}
                      />
                    }
                  >
                    Slett
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Slette påmeldingen til {registration.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {registration.tickets} billetter frigjøres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onCancel(registration)}
                      >
                        Slett påmelding
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
