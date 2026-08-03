"use client";

import { useState, type FormEvent } from "react";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";

import { db } from "@/lib/firebase";
import { CONTACT_EMAIL } from "@/lib/site";
import {
  MAX_TICKETS_PER_REGISTRATION,
  REGISTRATION_EMAIL_MAX,
  REGISTRATION_NAME_MAX,
  SoldOutError,
  formatPerformanceDate,
  submitRegistration,
  type AttendanceDoc,
  type PerformanceDate,
} from "@/lib/registration";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";
import { cn } from "@/lib/utils";

// A serializable stand-in for PerformanceDate — the server component can't
// pass Timestamp instances as client props, only plain data.
export interface RegistrationFormDate {
  id: string;
  startsAtMillis: number;
  location: string;
  capacity: number;
  price: number | null;
}

function toPerformanceDate(date: RegistrationFormDate): PerformanceDate {
  return {
    id: date.id,
    startsAt: Timestamp.fromMillis(date.startsAtMillis),
    location: date.location,
    capacity: date.capacity,
    price: date.price,
  };
}

interface RegistrationFormProps {
  slug: string;
  projectTitle: string;
  dates: RegistrationFormDate[];
  initialTakenByDateId: Record<string, number>;
}

type Status = "idle" | "submitting" | "success" | "error";

export function RegistrationForm({
  slug,
  projectTitle,
  dates,
  initialTakenByDateId,
}: RegistrationFormProps) {
  const [takenByDateId, setTakenByDateId] = useState(initialTakenByDateId);
  const [selectedDateId, setSelectedDateId] = useState<string | null>(
    dates.find((d) => (takenByDateId[d.id] ?? 0) < d.capacity)?.id ?? null,
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tickets, setTickets] = useState(1);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    date: RegistrationFormDate;
    tickets: number;
  } | null>(null);

  const selectedDate = dates.find((d) => d.id === selectedDateId) ?? null;
  const remainingForSelected = selectedDate
    ? Math.max(
        0,
        selectedDate.capacity - (takenByDateId[selectedDate.id] ?? 0),
      )
    : 0;
  const maxTickets = Math.max(
    1,
    Math.min(MAX_TICKETS_PER_REGISTRATION, remainingForSelected),
  );

  async function refreshCounts() {
    const snapshot = await getDocs(collection(db, "projects", slug, "attendance"));
    const counts: Record<string, number> = {};
    for (const docSnap of snapshot.docs) {
      counts[docSnap.id] = (docSnap.data() as AttendanceDoc).taken;
    }
    setTakenByDateId(counts);
    return counts;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!selectedDate) {
      setErrorMessage("Velg en dato.");
      return;
    }

    setStatus("submitting");
    setErrorMessage(null);
    try {
      await submitRegistration({
        slug,
        projectTitle,
        date: toPerformanceDate(selectedDate),
        name,
        email,
        tickets,
      });
      setConfirmed({ date: selectedDate, tickets });
      setStatus("success");
    } catch (err) {
      const counts = await refreshCounts().catch(() => takenByDateId);
      const stillFits =
        selectedDate.capacity - (counts[selectedDate.id] ?? 0) >= tickets;

      if (!stillFits) setSelectedDateId(null);

      if (
        err instanceof SoldOutError ||
        (err instanceof FirebaseError && err.code === "permission-denied")
      ) {
        setErrorMessage(
          "Beklager – det er ikke nok ledige billetter igjen på denne datoen. Velg gjerne en annen dato.",
        );
      } else {
        setErrorMessage("Noe gikk galt. Prøv igjen.");
      }
      setStatus("error");
    }
  }

  if (status === "success" && confirmed) {
    return (
      <div className="rounded-lg border border-white/15 bg-white/5 p-6">
        <h2 className="font-serif text-xl">Takk for påmeldingen!</h2>
        <p className="mt-3 font-serif text-sm leading-relaxed text-white/70">
          {confirmed.tickets}{" "}
          {confirmed.tickets === 1 ? "billett" : "billetter"} til{" "}
          {formatPerformanceDate(
            Timestamp.fromMillis(confirmed.date.startsAtMillis),
          )}
          , {confirmed.date.location}. Påmeldingen er registrert på {email}.
        </p>
        <p className="mt-3 font-serif text-sm leading-relaxed text-white/70">
          Du trenger ikke billett — møt opp og oppgi navnet ditt.
        </p>
        <p className="mt-6 text-xs text-white/50">
          Trenger du å avbestille?{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
              `Avbestilling – ${projectTitle}`,
            )}&body=${encodeURIComponent(
              `Navn: ${name}\nForestilling: ${projectTitle}\nDato: ${formatPerformanceDate(
                Timestamp.fromMillis(confirmed.date.startsAtMillis),
              )}\nAntall billetter: ${confirmed.tickets}`,
            )}`}
            className="underline underline-offset-4 hover:text-white"
          >
            Kontakt oss
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <fieldset className="flex flex-col gap-3">
        <legend className="font-serif text-sm text-white/70">
          Velg dato
        </legend>
        {dates.map((date) => {
          const taken = takenByDateId[date.id] ?? 0;
          const remaining = Math.max(0, date.capacity - taken);
          const soldOut = remaining <= 0;
          return (
            <label
              key={date.id}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-white/15 bg-white/5 p-4 transition-colors",
                selectedDateId === date.id && "border-white/50 bg-white/10",
                soldOut && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="date"
                  value={date.id}
                  checked={selectedDateId === date.id}
                  disabled={soldOut}
                  onChange={() => setSelectedDateId(date.id)}
                  className="accent-white"
                />
                <span>
                  <span className="block font-serif text-sm">
                    {formatPerformanceDate(
                      Timestamp.fromMillis(date.startsAtMillis),
                    )}
                  </span>
                  <span className="block text-xs text-white/50">
                    {date.location}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs text-white/50">
                {soldOut ? "Utsolgt" : `${remaining} ledige billetter`}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Fullt navn</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={REGISTRATION_NAME_MAX}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-post</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={REGISTRATION_EMAIL_MAX}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="tickets">Antall billetter</Label>
        <NumberField
          value={tickets}
          min={1}
          max={maxTickets}
          step={1}
          onValueChange={(value) => {
            if (value === null) return;
            setTickets(Math.max(1, Math.min(maxTickets, Math.round(value))));
          }}
        >
          <NumberFieldGroup>
            <NumberFieldDecrement>-</NumberFieldDecrement>
            <NumberFieldInput id="tickets" />
            <NumberFieldIncrement>+</NumberFieldIncrement>
          </NumberFieldGroup>
        </NumberField>
      </div>

      {errorMessage && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <Button type="submit" disabled={status === "submitting" || !selectedDate}>
        {status === "submitting" ? "Sender inn …" : "Meld meg på"}
      </Button>

      <p className="text-xs text-white/50">
        Trenger du å avbestille senere?{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="underline underline-offset-4 hover:text-white"
        >
          Kontakt oss
        </a>
        .
      </p>
    </form>
  );
}
