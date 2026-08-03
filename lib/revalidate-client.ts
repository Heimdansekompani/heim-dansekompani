// Best-effort: asks the server to drop its cached read of CMS content right
// after a save (see app/api/revalidate/route.ts), so the public pages
// reflect the change immediately instead of waiting out the cache's
// time-based fallback window. Never blocks or fails the save itself — a
// missed call just means the old content stays visible until that window
// naturally expires.
export async function requestRevalidate(
  tag: "om-content" | "personer-content" | "projects",
): Promise<void> {
  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  } catch {
    // Best-effort only — see comment above.
  }
}
