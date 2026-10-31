"use client";

import Link from "next/link";
import { CldImage } from "next-cloudinary";
import { EyeOff } from "lucide-react";

import { THUMBNAIL_ASPECT_RATIO, type ProjectThumbnail } from "@/lib/project";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  slug: string;
  title: string;
  thumbnail: ProjectThumbnail | null;
  // Formatted server-side rather than passed as a Firestore Timestamp —
  // Server Components can only pass plain, JSON-serializable props to
  // Client Components, and a Timestamp (with its toJSON method) isn't one.
  formattedDate: string;
  // Unpublished projects are only ever passed in for signed-in staff (see
  // ProjectListing). The public detail page 404s for them, so they link to
  // the admin editor instead.
  isDraft?: boolean;
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
  isDraft = false,
}: ProjectCardProps) {
  return (
    <Link
      href={isDraft ? `/admin/prosjekter/${slug}` : `/prosjekter/${slug}`}
      className="group flex flex-col gap-3"
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg border border-white/10 bg-white/5",
          isDraft && "border-2 border-dashed border-amber-400/70",
        )}
        style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}
      >
        {isDraft && (
          <span className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-xs font-medium text-black">
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
            Ikke publisert
          </span>
        )}
        {thumbnail && (
          <CldImage
            src={thumbnail.cloudinaryPublicId}
            alt=""
            fill
            crop={
              thumbnail.crop ? { type: "crop", ...thumbnail.crop } : undefined
            }
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className={cn(
              "object-cover transition-transform duration-300 group-hover:scale-105",
              isDraft && "opacity-50 grayscale",
            )}
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
