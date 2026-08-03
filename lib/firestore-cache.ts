import { Timestamp } from "firebase/firestore";

interface TimestampMarker {
  __timestampMillis: number;
}

function isTimestampMarker(value: unknown): value is TimestampMarker {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>).__timestampMillis === "number" &&
    Object.keys(value).length === 1
  );
}

// unstable_cache persists its return value through Vercel's Data Cache — an
// external store, not just in-process memory — which JSON-serializes
// whatever it's given. Firestore's Timestamp class instances don't survive
// that: they'd come back as plain {seconds, nanoseconds} objects with none
// of their methods, breaking every .toDate()/.toMillis() call downstream.
// These two functions convert Timestamps to a JSON-safe marker right before
// caching and rebuild real Timestamp instances right after reading from the
// cache, so an unstable_cache-wrapped Firestore read stays a drop-in
// replacement for the uncached version.
export function toCacheSafe<T>(value: T): T {
  if (value instanceof Timestamp) {
    return { __timestampMillis: value.toMillis() } as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCacheSafe(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = toCacheSafe(val);
    }
    return result as T;
  }
  return value;
}

export function fromCacheSafe<T>(value: T): T {
  if (isTimestampMarker(value)) {
    return Timestamp.fromMillis(value.__timestampMillis) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fromCacheSafe(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = fromCacheSafe(val);
    }
    return result as T;
  }
  return value;
}
