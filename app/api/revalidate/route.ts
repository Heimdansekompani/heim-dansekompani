import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import {
  isEditorOrAboveUid,
  verifyFirebaseIdToken,
} from "@/lib/verify-firebase-token";

export const runtime = "nodejs";

// Public pages read CMS content through unstable_cache (see app/om,
// app/personer, app/prosjekter) so they don't pay a fresh Firestore
// round-trip on every visit. Each cache entry also has a time-based fallback
// revalidate window, but the admin editors call this route right after a
// successful save so edits show up immediately instead of waiting it out.
const VALID_TAGS = ["om-content", "personer-content", "projects"] as const;
type ValidTag = (typeof VALID_TAGS)[number];

function isValidTag(tag: unknown): tag is ValidTag {
  return (
    typeof tag === "string" && (VALID_TAGS as readonly string[]).includes(tag)
  );
}

// Same session-cookie auth pattern as /api/cloudinary/sign — the caller's
// identity comes from the httpOnly `session` cookie set by /api/auth/session.
export async function POST(request: NextRequest) {
  const idToken = request.cookies.get("session")?.value;
  if (!idToken) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) {
    return NextResponse.json({ error: "Invalid session" }, { status: 401 });
  }

  const isEditor = await isEditorOrAboveUid(verified.uid, idToken);
  if (!isEditor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const tag = body?.tag;
  if (!isValidTag(tag)) {
    return NextResponse.json({ error: "Invalid tag" }, { status: 400 });
  }

  // "max" is Next 16's replacement for the old single-arg revalidateTag(tag)
  // — immediate, full invalidation of the tag (updateTag is the alternative
  // but is Server-Action-only, and this runs in a Route Handler).
  revalidateTag(tag, "max");
  return NextResponse.json({ ok: true });
}
