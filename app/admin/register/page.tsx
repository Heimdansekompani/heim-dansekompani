"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import type { UserAddress } from "@/lib/user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "Minst 8 tegn", test: (password) => password.length >= 8 },
  {
    label: "Minst én liten bokstav",
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: "Minst én stor bokstav",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: "Minst ett symbol",
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
];

export default function AdminRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [street, setStreet] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (
      !PASSWORD_REQUIREMENTS.every((requirement) => requirement.test(password))
    ) {
      setError("Passordet oppfyller ikke alle kravene under.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passordene er ikke like.");
      return;
    }

    setSubmitting(true);
    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const address: UserAddress = { street, postalCode, city };
      await setDoc(doc(db, "users", credential.user.uid), {
        email,
        role: "pending",
        createdAt: serverTimestamp(),
        name,
        address,
      });
      router.push("/admin");
    } catch {
      setError(
        "Registrering feilet. Sjekk at e-posten ikke allerede er i bruk.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">Registrer deg</h1>
      <p className="mt-2 font-serif text-sm text-white/50">
        Kontoen din må godkjennes av en administrator før du får tilgang.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">E-post</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Fullt navn</Label>
          <Input
            id="name"
            required
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="street">Gateadresse</Label>
          <Input
            id="street"
            required
            autoComplete="street-address"
            value={street}
            onChange={(event) => setStreet(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="postalCode">Postnummer</Label>
            <Input
              id="postalCode"
              required
              autoComplete="postal-code"
              value={postalCode}
              onChange={(event) => setPostalCode(event.target.value)}
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="city">Poststed</Label>
            <Input
              id="city"
              required
              autoComplete="address-level2"
              value={city}
              onChange={(event) => setCity(event.target.value)}
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Passord</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <ul className="mt-1 flex flex-col gap-0.5">
            {PASSWORD_REQUIREMENTS.map((requirement) => {
              const met = requirement.test(password);
              return (
                <li
                  key={requirement.label}
                  className={cn(
                    "font-serif text-xs",
                    met ? "text-emerald-400" : "text-white/50",
                  )}
                >
                  {met ? "✓" : "–"} {requirement.label}
                </li>
              );
            })}
          </ul>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="confirmPassword">Bekreft passord</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Registrerer …" : "Registrer deg"}
        </Button>
      </form>
    </div>
  );
}
