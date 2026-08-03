import { cookies } from "next/headers";

import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

const COOKIE_NAME = "session";
const ROLE_COOKIE_NAME = "session_role";

// Best-effort staff check for gating public pages behind an "under
// construction" placeholder while the site is soft-launched — not a
// security boundary (Firestore rules are that), just UX. Reuses the same
// httpOnly session cookie the Cloudinary sign route relies on (see
// app/api/auth/session/route.ts).
//
// Reads the role from the session_role cookie (set alongside the session
// cookie at sign-in/token-refresh) instead of looking it up in Firestore on
// every call — this runs on every public page render, so a live Firestore
// round-trip here was adding real latency to every navigation. The
// trade-off is a role change can lag up to one token refresh (~hourly)
// before this gate sees it, which is fine for a UX-only check.
export async function isStaffRequest(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return false;

  const verified = await verifyFirebaseIdToken(token);
  if (!verified) return false;

  const role = jar.get(ROLE_COOKIE_NAME)?.value;
  return role === "admin" || role === "editor";
}
