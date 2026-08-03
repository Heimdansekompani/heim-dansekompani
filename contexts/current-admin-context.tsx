"use client";

import { createContext, useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type AdminRole = "admin" | "editor" | "employee" | "pending" | null;

// Mirrors the firestore.rules isEditorOrAbove() check — editor and admin can
// author/publish projects; employee and pending cannot.
export function isEditorOrAbove(role: AdminRole): boolean {
  return role === "admin" || role === "editor";
}

export interface CurrentAdminState {
  user: User | null;
  role: AdminRole;
  loading: boolean;
}

export const CurrentAdminContext = createContext<CurrentAdminState | null>(
  null,
);

/**
 * Owns the single site-wide Firebase auth + role subscription — mounted once
 * in the root layout so every useCurrentAdmin() call (see hooks/use-current-admin.ts)
 * reads from this shared state instead of each opening its own
 * onIdTokenChanged/onSnapshot listener pair (previously duplicated across
 * ~8 components, each restarting its own loading cycle on every route change).
 *
 * This is a UX convenience for the /admin route guard and nav, not the real
 * security boundary — that's Firestore rules and the Cloudinary sign route.
 *
 * Also keeps the httpOnly session cookie (used by the Cloudinary sign route,
 * which can't receive a custom Authorization header) in sync: onIdTokenChanged
 * fires on sign-in, on the ~hourly token refresh, and on sign-out.
 */
export function CurrentAdminProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<CurrentAdminState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    let unsubscribeRole: (() => void) | undefined;

    const unsubscribeAuth = onIdTokenChanged(auth, async (user) => {
      unsubscribeRole?.();

      if (!user) {
        setState({ user: null, role: null, loading: false });
        fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
        return;
      }

      setState((prev) => ({ ...prev, user, loading: true }));

      const idToken = await user.getIdToken();
      fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      }).catch(() => {});

      unsubscribeRole = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
        const role = (snapshot.data()?.role as AdminRole) ?? null;
        setState({ user, role, loading: false });
      });
    });

    return () => {
      unsubscribeAuth();
      unsubscribeRole?.();
    };
  }, []);

  return (
    <CurrentAdminContext.Provider value={state}>
      {children}
    </CurrentAdminContext.Provider>
  );
}
