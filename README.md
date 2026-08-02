# Heim Dansekompani

Website for the dance company **Heim Dansekompani**: a public site presenting
the company's projects and people, plus a full admin panel where the team
builds project pages themselves — no code changes needed for day-to-day
content work.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19, TypeScript
- [Tailwind CSS 4](https://tailwindcss.com) with container queries
- [Firebase](https://firebase.google.com) — Auth (email/password) and
  Firestore (content + roles)
- [Cloudinary](https://cloudinary.com) — image/video storage, cropping,
  transformations (blur, posters)
- [Tiptap](https://tiptap.dev) — rich text editing
- [Embla Carousel](https://www.embla-carousel.com) — image slideshows
- Base UI + shadcn-style components, `pnpm`

## Pages

**Public**

- `/` — front page
- `/prosjekter` — published projects; `/prosjekter/[slug]` — project pages
  built from the section editor
- `/personer` — the team, with portraits and bios
- `/om` — about the company (same section system as projects)
- `/kontakt` — contact form (submissions stored in Firestore, readable only
  by admins)

**Admin (`/admin`)**

- Email/password login; new accounts self-register and land as `pending`
  until an existing admin approves them (`admin` / `editor` roles)
- Project editor with live preview (desktop + 375 px phone mode)
- People editor, about-page editor, administrator management, own profile

## The section editor

Project pages are built from **sections** of one or two **blocks**
(media/text), with:

- Layout modes: single block, split (adjustable ratio, overlap snapping,
  mirroring), and text-on-media overlay (falls back to stacked text on
  small screens)
- Media blocks: images or video (player or ambient autoplay loop), blur
  levels, per-item captions/credits, width + placement controls
- **Slideshows**: 2+ images in a block become a looping carousel — swipe,
  arrows and dots always available, optional auto-advance as timed steps or
  a continuous glide with three speeds (disabled for
  `prefers-reduced-motion`), full-width view or a 2–4-wide filmstrip
- Rich text: sizes, colors, alignment, lists, links — including links
  styled as buttons ("Knapp") for e.g. ticket sales
- Section styling: background color bands, width (standard / 90 % / full
  bleed), adjustable gap to the previous section (standard / small / none);
  per-page background color

Sections are stored as versioned JSON in Firestore and **migrate on read**:
old documents are normalized to the current shape when loaded and rewritten
on the next save. There are no migration scripts.

The public renderer and the admin preview share the exact same component
tree, and all responsive behavior inside sections uses CSS **container
queries** — which is what makes the phone-mode preview accurate.

## Getting started

Requirements: Node 20+, `pnpm`, a Firebase project, a Cloudinary account.

```bash
pnpm install
cp .env.example .env.local   # then fill in the values
pnpm dev
```

Environment variables (see [.env.example](.env.example)):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase web app config (safe to expose) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud (public) |
| `NEXT_PUBLIC_CLOUDINARY_API_KEY` | Cloudinary API key (public) |
| `CLOUDINARY_API_SECRET` | **Server-only** — signs upload requests |

Firebase setup:

1. Enable **Authentication → Email/password**
2. Create a **Firestore** database
3. Deploy the security rules: `pnpm exec firebase deploy --only firestore:rules`
4. Register an account at `/admin/register`, then set its `role` to
   `"admin"` on the `users/{uid}` document in the Firestore console
   (bootstrapping the first admin; later admins are promoted in the UI)

## Security model

There is **no Firebase Admin SDK / service account** anywhere. Instead:

- API routes verify Firebase ID tokens locally against Google's JWKS
  ([lib/verify-firebase-token.ts](lib/verify-firebase-token.ts))
- Admin status is checked by reading the caller's own `users/{uid}` doc via
  the Firestore REST API with the caller's own token — possible because of
  the self-read security rule
- The Cloudinary upload signature route
  ([app/api/cloudinary/sign](app/api/cloudinary/sign/route.ts)) requires a
  verified admin; the session travels in an `httpOnly` `SameSite=Strict`
  cookie set by [app/api/auth/session](app/api/auth/session/route.ts)
- Firestore rules ([firestore.rules](firestore.rules)) are default-deny:
  drafts are invisible to the public, users can't read each other or
  promote themselves, contact submissions are write-only for visitors
- Authored rich text renders through a fail-closed React renderer
  ([lib/render-rich-text.tsx](lib/render-rich-text.tsx)) — unknown nodes are
  dropped, hrefs pass a protocol allowlist, colors are re-validated as hex

## Deployment (Vercel)

1. Import the repo and set every variable from `.env.example` in the Vercel
   project settings
2. Add the production domain(s) to **Firebase Auth → Authorized domains**,
   or login will fail on the deployed site
3. Make sure the current `firestore.rules` are deployed

## Development notes

- `pnpm dev` / `pnpm build` / `pnpm lint` / `pnpm format`
- The section data model and its normalization live in
  [lib/project.ts](lib/project.ts) — normalization must stay deterministic,
  because the admin forms detect unsaved changes by comparing JSON snapshots
