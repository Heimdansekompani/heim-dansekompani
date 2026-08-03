import { NextRequest, NextResponse } from "next/server";

import { fetchUserRole, verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

export const runtime = "nodejs";

const COOKIE_NAME = "session";
const ROLE_COOKIE_NAME = "session_role";

// Mirrors the caller's Firebase ID token into an httpOnly cookie, so
// same-origin requests we don't control the headers of (e.g. the Cloudinary
// upload widget's internal fetch) still carry proof of identity. There's no
// Admin SDK to mint a real session cookie, so this just re-verifies and
// re-stores the ID token itself, refreshed by the client roughly hourly.
//
// Also snapshots the caller's Firestore role into a companion cookie so
// lib/server-auth.ts's isStaffRequest() (checked on every public page render)
// can read it directly instead of hitting Firestore on every navigation. The
// snapshot is only as fresh as the next token refresh (~hourly, or the next
// sign-in) — fine here since that check is a soft-launch UX gate, not a
// security boundary (see lib/server-auth.ts). Routes that gate real
// privileged actions (/api/cloudinary/sign, /api/revalidate) still look the
// role up live.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length)
    : null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const role = await fetchUserRole(verified.uid, idToken);

  const maxAge = Math.max(
    0,
    verified.expiresAt - Math.floor(Date.now() / 1000),
  );

  const response = NextResponse.json({ ok: true });
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
  response.cookies.set(COOKIE_NAME, idToken, cookieOptions);
  response.cookies.set(ROLE_COOKIE_NAME, role ?? "", cookieOptions);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  response.cookies.delete(ROLE_COOKIE_NAME);
  return response;
}
