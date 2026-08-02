"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc, type Timestamp } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { ProfileForm } from "@/components/admin/profile-form";
import { SecuritySettings } from "@/components/admin/security-settings";
import type { UserProfile } from "@/lib/user-profile";

function formatMemberSince(
  createdAt: Timestamp | null,
  authCreationTime: string | undefined,
): string | null {
  const date = createdAt
    ? createdAt.toDate()
    : authCreationTime
      ? new Date(authCreationTime)
      : null;
  if (!date) return null;

  return date.toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminHomePage() {
  const { user, loading: authLoading } = useCurrentAdmin();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data();
      setProfile({
        email: (data?.email as string) ?? user.email ?? "",
        name: (data?.name as string) ?? "",
        address: (data?.address as UserProfile["address"]) ?? null,
        photo: (data?.photo as UserProfile["photo"]) ?? null,
        createdAt: (data?.createdAt as UserProfile["createdAt"]) ?? null,
      });
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  // If a verify-first email change was confirmed since the last visit,
  // Firebase Auth's own email already reflects it, but the Firestore doc
  // (what the rest of the admin panel, e.g. Administratorer, displays)
  // doesn't yet — reconcile it here. A forced token refresh is required
  // first: the security rule checks the ID token's email claim, which only
  // picks up the change after that.
  useEffect(() => {
    if (!user || !profile) return;
    if (user.email === profile.email) return;

    (async () => {
      await user.reload();
      if (!user.email || user.email === profile.email) return;
      await user.getIdToken(true);
      await updateDoc(doc(db, "users", user.uid), { email: user.email });
    })().catch(() => {});
  }, [user, profile]);

  if (authLoading || loading || !user || !profile) {
    return <p className="font-serif text-sm text-white/50">Laster …</p>;
  }

  const memberSince = formatMemberSince(
    profile.createdAt,
    user.metadata.creationTime,
  );

  return (
    <div className="flex flex-col gap-12">
      <div>
        <h1 className="font-serif text-2xl tracking-wide">Min profil</h1>
        {memberSince && (
          <p className="mt-1 font-serif text-sm text-white/50">
            Medlem siden {memberSince}
          </p>
        )}
      </div>

      <ProfileForm uid={user.uid} profile={profile} />

      <SecuritySettings user={user} />
    </div>
  );
}
