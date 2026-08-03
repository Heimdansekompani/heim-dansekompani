import { createRemoteJWKSet, jwtVerify } from "jose";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

// Module-level singleton so the JWKS cache persists across warm invocations.
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export interface VerifiedFirebaseToken {
  uid: string;
  expiresAt: number;
}

/**
 * Verifies a Firebase Auth ID token's signature/issuer/audience/expiry
 * locally against Google's public JWKS. No Firebase Admin SDK involved.
 * Returns null on any verification failure.
 */
export async function verifyFirebaseIdToken(
  idToken: string,
): Promise<VerifiedFirebaseToken | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") {
      return null;
    }

    return { uid: payload.sub, expiresAt: payload.exp };
  } catch {
    return null;
  }
}

/**
 * Reads a uid's role from Firestore by calling the REST API *as that user*
 * (their own ID token as Bearer auth). This only succeeds because of the
 * `users/{uid}` self-read security rule — there's no Admin SDK / service
 * account involved.
 */
async function fetchUserRole(
  uid: string,
  idToken: string,
): Promise<string | null> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) return null;

  const data = await response.json();
  return data?.fields?.role?.stringValue ?? null;
}

/** Checks whether a uid has role 'admin' in Firestore. */
export async function isAdminUid(
  uid: string,
  idToken: string,
): Promise<boolean> {
  return (await fetchUserRole(uid, idToken)) === "admin";
}

// Mirrors contexts/current-admin-context.tsx's isEditorOrAbove — editor and
// admin count as staff for the public-page "under construction" gate.
export async function isEditorOrAboveUid(
  uid: string,
  idToken: string,
): Promise<boolean> {
  const role = await fetchUserRole(uid, idToken);
  return role === "admin" || role === "editor";
}
