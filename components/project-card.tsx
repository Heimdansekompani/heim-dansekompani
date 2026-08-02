"use client";

import Link from "next/link";
import { CldImage } from "next-cloudinary";

import { THUMBNAIL_ASPECT_RATIO, type ProjectThumbnail } from "@/lib/project";

interface ProjectCardProps {
  slug: string;
  title: string;
  thumbnail: ProjectThumbnail | null;
  // Formatted server-side rather than passed as a Firestore Timestamp —
  // Server Components can only pass plain, JSON-serializable props to
  // Client Components, and a Timestamp (with its toJSON method) isn't one.
  formattedDate: string;
}

// next-cloudinary's components use hooks internally but don't ship their
// own "use client" boundary, so they break when rendered straight from a
// Server Component — this wrapper is the client boundary instead (see
// PersonCard for the same pattern).
export function ProjectCard({
  slug,
  title,
  thumbnail,
  formattedDate,
}: ProjectCardProps) {
  return (
    <Link href={`/prosjekter/${slug}`} className="group flex flex-col gap-3">
      <div
        className="relative w-full overflow-hidden rounded-lg border border-white/10 bg-white/5"
        style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}
      >
        {thumbnail && (
          <CldImage
            src={thumbnail.cloudinaryPublicId}
            alt=""
            fill
            crop={
              thumbnail.crop ? { type: "crop", ...thumbnail.crop } : undefined
            }
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
      </div>
      <div>
        <p className="font-serif text-lg text-white/90 transition-colors group-hover:text-white">
          {title}
        </p>
        <p className="font-serif text-sm text-white/50">{formattedDate}</p>
      </div>
    </Link>
  );
}
