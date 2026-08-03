import { cookies } from "next/headers";

import { isEditorOrAboveUid, verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

const COOKIE_NAME = "session";

// Best-effort staff check for gating public pages behind an "under
// construction" placeholder while the site is soft-launched — not a
// security boundary (Firestore rules are that), just UX. Reuses the same
// httpOnly session cookie the Cloudinary sign route relies on (see
// app/api/auth/session/route.ts).
export async function isStaffRequest(): Promise<boolean> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return false;

  const verified = await verifyFirebaseIdToken(token);
  if (!verified) return false;

  return isEditorOrAboveUid(verified.uid, token);
}
