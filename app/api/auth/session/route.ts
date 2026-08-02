import { NextRequest, NextResponse } from "next/server";

import { verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

export const runtime = "nodejs";

const COOKIE_NAME = "session";

// Mirrors the caller's Firebase ID token into an httpOnly cookie, so
// same-origin requests we don't control the headers of (e.g. the Cloudinary
// upload widget's internal fetch) still carry proof of identity. There's no
// Admin SDK to mint a real session cookie, so this just re-verifies and
// re-stores the ID token itself, refreshed by the client roughly hourly.
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

  const maxAge = Math.max(
    0,
    verified.expiresAt - Math.floor(Date.now() / 1000),
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}
