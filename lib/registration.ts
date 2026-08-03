import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

// Mirrored in firestore.rules (attendance increment caps and the tickets
// range in isValidRegistrationCreate) — change both together.
export const MAX_TICKETS_PER_REGISTRATION = 10;
export const REGISTRATION_NAME_MAX = 200;
export const REGISTRATION_EMAIL_MAX = 320;

// One showing of a performance. Stored on the project doc as a map keyed by
// `id` (see PerformanceDateMap) rather than an array — Firestore security
// rules can't search arrays, but they can index a map by the dateId a
// registration claims, which is what lets the rules read this date's
// capacity and enforce it at write time.
export interface PerformanceDate {
  id: string;
  // Date and time combined.
  startsAt: Timestamp;
  location: string;
  // Total tickets available for this date.
  capacity: number;
  // Varighet i minutter.
  durationMinutes: number;
  // NOK per ticket; null = free. Not editable anywhere yet — reserved so a
  // future Vipps payment step won't need a data migration.
  price: number | null;
}

// The Firestore shape on projects/{slug}.performanceDates.
export type PerformanceDateMap = Record<string, Omit<PerformanceDate, "id">>;

// projects/{slug}/attendance/{dateId} — the per-date seat counter. Kept
// separate from the project doc because anonymous visitors must be able to
// write it (transactionally, under strict rules) but must never be able to
// touch the project doc itself. Holds a count only, no PII, so it's
// publicly readable for remaining-seat display.
export interface AttendanceDoc {
  taken: number;
}

// Later payment states ("pending_payment") and cancellation flows can extend
// this union; today every registration lands confirmed.
export type RegistrationStatus = "confirmed";

// projects/{slug}/registrations/{id} — public create-only (names and emails
// are never readable without editor access; see firestore.rules).
export interface Registration {
  name: string;
  email: string;
  tickets: number;
  dateId: string;
  projectSlug: string;
  // Denormalized for the admin list and a future confirmation email —
  // registrations must stay meaningful even if the project is renamed.
  projectTitle: string;
  status: RegistrationStatus;
  // Snapshot of the date's price at registration time; null = free.
  pricePerTicket: number | null;
  createdAt: Timestamp;
}

// Thrown when the requested tickets no longer fit within capacity — either
// seen directly by the transaction's own read, or surfaced as a
// permission-denied from the rules when a concurrent registration won the
// last seats.
export class SoldOutError extends Error {
  constructor() {
    super("Not enough tickets remaining");
    this.name = "SoldOutError";
  }
}

// Same contract as normalizeSections (lib/project.ts): deterministic — the
// admin form compares JSON.stringify snapshots to detect unsaved changes —
// and never emits `undefined`. Entries without a usable id or startsAt are
// dropped; everything else falls back to a concrete default.
export function normalizePerformanceDates(raw: unknown): PerformanceDate[] {
  if (!isRecord(raw)) return [];
  const dates: PerformanceDate[] = [];
  for (const [id, value] of Object.entries(raw)) {
    if (!id || !isRecord(value)) continue;
    if (!(value.startsAt instanceof Timestamp)) continue;
    dates.push({
      id,
      startsAt: value.startsAt,
      location: typeof value.location === "string" ? value.location : "",
      capacity:
        typeof value.capacity === "number" &&
        Number.isFinite(value.capacity) &&
        value.capacity > 0
          ? Math.round(value.capacity)
          : 0,
      // Falls back to 60 for dates saved before this field existed.
      durationMinutes:
        typeof value.durationMinutes === "number" &&
        Number.isFinite(value.durationMinutes) &&
        value.durationMinutes > 0
          ? Math.round(value.durationMinutes)
          : 60,
      price:
        typeof value.price === "number" &&
        Number.isFinite(value.price) &&
        value.price >= 0
          ? value.price
          : null,
    });
  }
  // Chronological, with the id as tiebreak so equal-time dates still sort
  // identically on every normalize (determinism, see above).
  dates.sort(
    (a, b) =>
      a.startsAt.toMillis() - b.startsAt.toMillis() ||
      a.id.localeCompare(b.id),
  );
  return dates;
}

export function toPerformanceDateMap(
  dates: PerformanceDate[],
): PerformanceDateMap {
  const map: PerformanceDateMap = {};
  for (const date of dates) {
    map[date.id] = {
      startsAt: date.startsAt,
      location: date.location,
      capacity: date.capacity,
      durationMinutes: date.durationMinutes,
      price: date.price,
    };
  }
  return map;
}

// Always pinned to Europe/Oslo: Vercel renders server components in UTC, so
// relying on the runtime's local timezone would shift evening shows to the
// wrong day/hour on the public page.
export function formatPerformanceDate(startsAt: Timestamp): string {
  return startsAt.toDate().toLocaleString("nb-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} t`;
  return `${hours} t ${remainder} min`;
}

// The single choke point for creating a registration — a future confirmation
// email (Resend API route) or Vipps payment step hooks in around this call.
//
// The registration doc and the seat-counter increment are one transaction:
// firestore.rules only accepts the registration if the same transaction
// moved the counter up by exactly `tickets` (getAfter), and only accepts the
// counter write if it stays within the date's capacity. Concurrent
// registrations serialize on the counter doc, so the last seats can't be
// sold twice — the loser's transaction is denied by the rules and surfaces
// here as permission-denied.
export async function submitRegistration(args: {
  slug: string;
  projectTitle: string;
  date: PerformanceDate;
  name: string;
  email: string;
  tickets: number;
}): Promise<void> {
  const { slug, date, tickets } = args;
  const counterRef = doc(db, "projects", slug, "attendance", date.id);
  const registrationRef = doc(collection(db, "projects", slug, "registrations"));

  await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    const taken = counterSnap.exists()
      ? (counterSnap.data() as AttendanceDoc).taken
      : 0;
    if (taken + tickets > date.capacity) throw new SoldOutError();

    // Explicit value rather than increment() — the rules verify the exact
    // before/after math, and this transaction just read `taken`.
    if (counterSnap.exists()) {
      transaction.update(counterRef, { taken: taken + tickets });
    } else {
      transaction.set(counterRef, { taken: tickets });
    }

    transaction.set(registrationRef, {
      name: args.name.trim(),
      email: args.email.trim(),
      tickets,
      dateId: date.id,
      projectSlug: slug,
      projectTitle: args.projectTitle,
      status: "confirmed",
      pricePerTicket: date.price,
      // serverTimestamp() satisfies the rules' `createdAt == request.time`
      // check (same pattern as contactSubmissions).
      createdAt: serverTimestamp(),
    });
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
