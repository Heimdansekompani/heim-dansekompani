import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { isAdminUid, verifyFirebaseIdToken } from "@/lib/verify-firebase-token";

export const runtime = "nodejs";

// Issues a Cloudinary upload signature, but only to a verified admin. The
// caller's identity comes from the httpOnly `session` cookie (set by
// /api/auth/session) rather than an Authorization header, because the
// Cloudinary upload widget's internal fetch to this route can't be given
// custom headers — only the request URL is configurable.
export async function POST(request: NextRequest) {
  const idToken = request.cookies.get("session")?.value;
  if (!idToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const isAdmin = await isAdminUid(verified.uid, idToken);
  if (!isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary is not configured" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const paramsToSign = body?.paramsToSign;
  if (!paramsToSign || typeof paramsToSign !== "object") {
    return NextResponse.json(
      { error: "Missing paramsToSign" },
      { status: 400 },
    );
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({ signature });
}
