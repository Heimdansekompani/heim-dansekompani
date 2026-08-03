import Link from "next/link";
import { getCldImageUrl, getCldVideoUrl } from "next-cloudinary";
import { LogoMark } from "@/components/logo-mark";

const HERO_VIDEO_PUBLIC_ID = "Heim_Nettside_Video_pyi4ww";
// Matches BLUR_STRENGTH[1] in lib/project.ts (the "light" CMS blur level) —
// close to the old CSS blur-sm this replaces.
const HERO_BLUR_STRENGTH = 350;

// Baked server-side by Cloudinary instead of a CSS blur filter: no
// per-frame GPU cost in the browser, no scale-110 needed to hide the CSS
// blur's edge fringe, and blurred footage encodes far smaller than sharp
// footage at the same visual quality. width caps the delivered resolution —
// full source res is wasted once it's this blurred. See
// components/section-media.tsx's "ambient" video branch for the same
// pattern used elsewhere in the CMS.
//
// quality is pinned to "auto:best" rather than left to default: any
// transformation forces Cloudinary to re-encode the asset (it can no longer
// serve the untouched original upload), and default q_auto resolves to a
// file-size-biased tier that visibly recompressed this footage on top of
// the blur. "best" costs more bytes, but blurred footage is cheap to encode
// at high quality since there's little detail left to spend bits on.
const heroVideoSrc = getCldVideoUrl({
  src: HERO_VIDEO_PUBLIC_ID,
  width: 1920,
  quality: "auto:best",
  rawTransformations: [`e_blur:${HERO_BLUR_STRENGTH}`],
});

const heroPosterSrc = getCldImageUrl({
  src: HERO_VIDEO_PUBLIC_ID,
  assetType: "video",
  format: "jpg",
  width: 1920,
  quality: "auto:best",
  rawTransformations: ["so_0", `e_blur:${HERO_BLUR_STRENGTH}`],
});

export default function Home() {
  return (
    <div className="relative -mt-20 flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <video
        className="absolute inset-0 -z-10 h-full w-full object-cover"
        src={heroVideoSrc}
        poster={heroPosterSrc}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
      />
      <div className="absolute inset-0 -z-10 bg-black/40" />
      <LogoMark
        className="h-auto w-35 text-white sm:w-56 lg:w-72"
        src="/images/logos/logo-main-white.png"
        width={900}
        height={450}
      />
      <h1 className="font-serif text-6xl font-semibold tracking-[0.2em] sm:text-8xl lg:text-9xl underline underline-offset-6">
        HEIM
      </h1>
      <p className="mt-2 font-serif text-2xl tracking-[0.2em] sm:text-4xl lg:text-5xl ">Dansekompani</p>
      <p className="mt-8 max-w-xl font-serif text-base leading-relaxed text-white/80 sm:text-lg">
        Et nyetablert dansekompani i skjæringspunktet mellom hip hop og
        samtidsdans.
      </p>
      <Link
        href="/om"
        className="mt-10 font-serif text-sm tracking-wide text-white underline underline-offset-4 hover:text-white/80"
      >
        Les mer om kompaniet
      </Link>
    </div>
  );
}
