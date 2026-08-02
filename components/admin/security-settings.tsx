"use client";

import { useState, type FormEvent } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
  type User,
} from "firebase/auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Firebase requires a recent sign-in before it will accept a password or
// email change; re-entering the current password each time satisfies that
// without forcing a full re-login.
function reauthenticate(user: User, currentPassword: string) {
  if (!user.email) throw new Error("Kontoen mangler en e-postadresse.");
  return reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, currentPassword),
  );
}

export function SecuritySettings({ user }: { user: User }) {
  return (
    <div className="flex flex-col gap-10">
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

function ChangeEmailForm({ user }: { user: User }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      await reauthenticate(user, currentPassword);
      // The account's email only actually changes once the confirmation
      // link is clicked — see the reconciliation effect in AdminHomePage
      // that syncs the Firestore users/{uid} doc once that happens.
      await verifyBeforeUpdateEmail(user, newEmail);
      setSuccess(
        `Vi har sendt en bekreftelseslenke til ${newEmail}. E-posten endres først når du klikker på lenken der.`,
      );
      setCurrentPassword("");
      setNewEmail("");
    } catch {
      setError("Kunne ikke endre e-post. Sjekk passordet og prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <h2 className="font-serif text-lg tracking-wide">Endre e-post</h2>
        <p className="mt-1 font-serif text-sm text-white/50">
          Gjeldende e-post: {user.email}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email-current-password">Nåværende passord</Label>
        <Input
          id="email-current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-email">Ny e-post</Label>
        <Input
          id="new-email"
          type="email"
          autoComplete="email"
          required
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Sender …" : "Send bekreftelse"}
      </Button>
    </form>
  );
}

function ChangePasswordForm({ user }: { user: User }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError("De nye passordene er ikke like.");
      return;
    }

    setSubmitting(true);
    try {
      await reauthenticate(user, currentPassword);
      await updatePassword(user, newPassword);
      setSuccess("Passordet er endret.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError(
        "Kunne ikke endre passord. Sjekk nåværende passord og prøv igjen.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h2 className="font-serif text-lg tracking-wide">Endre passord</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password-current-password">Nåværende passord</Label>
        <Input
          id="password-current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">Nytt passord</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Bekreft nytt passord</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-emerald-400">{success}</p>}
      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Lagrer …" : "Endre passord"}
      </Button>
    </form>
  );
}
