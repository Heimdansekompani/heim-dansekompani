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
 * Checks whether a uid has role 'admin' in Firestore, by calling the
 * Firestore REST API *as that user* (their own ID token as Bearer auth).
 * This only succeeds because of the `users/{uid}` self-read security rule —
 * there's no Admin SDK / service account involved.
 */
export async function isAdminUid(
  uid: string,
  idToken: string,
): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!response.ok) return false;

  const data = await response.json();
  return data?.fields?.role?.stringValue === "admin";
}
