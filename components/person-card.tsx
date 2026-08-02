"use client";

import { CldImage } from "next-cloudinary";

import { PORTRAIT_ASPECT_RATIO, type PersonEntry } from "@/lib/person";
import { isSafeHref } from "@/lib/rich-text-constants";
import { lorem } from "next/dist/next-devtools/dev-overlay/utils/lorem";

// next-cloudinary's components use hooks internally but don't ship their
// own "use client" boundary, so they break when rendered straight from a
// Server Component — this wrapper is the client boundary instead.
export function PersonCard({ person }: { person: PersonEntry }) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-10">
      <div
        className="relative w-32 shrink-0 overflow-hidden border border-white/15 bg-white/5"
        style={{ aspectRatio: PORTRAIT_ASPECT_RATIO }}
      >
        {person.image && (
          <CldImage
            src={person.image.cloudinaryPublicId}
            alt={person.name}
            fill
            crop={
              person.image.crop
                ? { type: "crop", ...person.image.crop }
                : undefined
            }
            sizes="128px"
            className="object-cover"
          />
        )}
      </div>
      <div>
        <h2 className="font-serif text-xl tracking-wide">{person.name}</h2>
        {person.role && (
          <p className="mt-1 font-serif text-sm text-white/50">{person.role}</p>
        )}
        {person.bio && (
          <p className="mt-4 max-w-2xl font-serif text-base leading-relaxed whitespace-pre-line text-white/80">
            {person.bio}
          </p>
        )}
        {person.socialLink && isSafeHref(person.socialLink.url) && (
          <a
            href={person.socialLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block font-serif text-sm text-white/70 underline underline-offset-2 hover:text-white"
          >
            {person.socialLink.label || person.socialLink.url}
          </a>
        )}
      </div>
    </div>
  );
}

