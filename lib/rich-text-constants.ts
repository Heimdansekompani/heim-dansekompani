// Fixed font-size preset scale, matching the site's existing Tailwind text
// sizes (see app/personer/page.tsx, app/kontakt/page.tsx). Storing the exact
// rem value (rather than the "sm"/"lg" token) as the Tiptap fontSize mark
// attribute means the editor's own live WYSIWYG preview renders correctly
// (valid CSS), while the read-only renderer maps these known values back to
// real Tailwind classes — never rendering an arbitrary/untrusted size.
export const FONT_SIZE_OPTIONS = [
  { value: "0.875rem", label: "Liten" },
  { value: "1rem", label: "Normal" },
  { value: "1.25rem", label: "Stor" },
  { value: "1.5rem", label: "Ekstra stor" },
  { value: "1.875rem", label: "Overskrift" },
  { value: "2.25rem", label: "Stor overskrift" },
  { value: "3rem", label: "Enorm" },
] as const;

// Superset of the picker: 1.125rem was removed from FONT_SIZE_OPTIONS but
// stays mapped so already-authored content keeps rendering. The heading-range
// sizes step down when the rendered content sits in a narrow container
// (mobile, or the admin preview's phone mode) — the section renderer wraps
// all authored content in an @container.
export const FONT_SIZE_CLASS_BY_VALUE: Record<string, string> = {
  "0.875rem": "text-sm",
  "1rem": "text-base",
  "1.125rem": "text-lg",
  "1.25rem": "text-xl",
  "1.5rem": "text-xl @2xl:text-2xl",
  "1.875rem": "text-2xl @2xl:text-3xl",
  "2.25rem": "text-3xl @2xl:text-4xl",
  "3rem": "text-4xl @2xl:text-5xl",
};

export const TEXT_ALIGN_CLASS_BY_VALUE: Record<string, string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

// A link either renders as plain underlined text ("link") or disguised as a
// button. The classes are shared by the admin editor (injected via the Link
// extension's renderHTML) and the public renderer, so the editor is WYSIWYG.
// Values are validated against this map before styling — an unknown stored
// variant falls back to a plain link.
export const LINK_BUTTON_CLASS = {
  button:
    "my-1 inline-block rounded-full bg-white px-5 py-2 font-sans text-sm font-medium tracking-wide text-black no-underline transition-colors hover:bg-white/80",
  "button-outline":
    "my-1 inline-block rounded-full border border-white/50 px-5 py-2 font-sans text-sm font-medium tracking-wide text-white no-underline transition-colors hover:border-white hover:bg-white/10",
} as const;

export type ButtonLinkVariant = keyof typeof LINK_BUTTON_CLASS;
export type LinkVariant = "link" | ButtonLinkVariant;

export function isButtonLinkVariant(
  value: unknown,
): value is ButtonLinkVariant {
  return typeof value === "string" && value in LINK_BUTTON_CLASS;
}

// Authored colors (text color, section/page backgrounds) are stored as raw
// hex strings and re-validated before being inlined as CSS — never trusting
// stored data to be a safe CSS value.
export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{3,8}$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

// Only these link schemes are ever rendered on the public site, even though
// the value isn't raw HTML — an authored href is still user-controlled data.
export const ALLOWED_LINK_PROTOCOLS = ["http:", "https:", "mailto:"];

export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length === 0) return false;
  try {
    const url = new URL(href, "https://placeholder.invalid");
    return ALLOWED_LINK_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
}
