"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { CldImage } from "next-cloudinary";

import { db } from "@/lib/firebase";
import { THUMBNAIL_ASPECT_RATIO, type Project } from "@/lib/project";
import { requestRevalidate } from "@/lib/revalidate-client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

function formatEventDate(project: Project): string {
  return project.eventDate.toDate().toLocaleDateString("nb-NO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminProsjekterPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingSlug, setTogglingSlug] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  useEffect(() => {
    const projectsQuery = query(
      collection(db, "projects"),
      orderBy("eventDate", "desc"),
    );
    const unsubscribe = onSnapshot(projectsQuery, (snapshot) => {
      setProjects(snapshot.docs.map((document) => document.data() as Project));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function togglePublished(project: Project) {
    setToggleError(null);
    setTogglingSlug(project.slug);
    try {
      await updateDoc(doc(db, "projects", project.slug), {
        published: !project.published,
        updatedAt: serverTimestamp(),
      });
      requestRevalidate("projects");
    } catch {
      setToggleError("Kunne ikke endre status. Prøv igjen.");
    } finally {
      setTogglingSlug(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl tracking-wide">Prosjekter</h1>
        <Button
          render={<Link href="/admin/prosjekter/ny" />}
          nativeButton={false}
          size="sm"
        >
          Nytt prosjekt
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 font-serif text-sm text-white/50">Laster …</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {projects.map((project) => (
            <li
              key={project.slug}
              className="flex items-center justify-between gap-4 border-b border-white/10 pb-4"
            >
              <Link
                href={`/admin/prosjekter/${project.slug}`}
                className="flex flex-1 items-center gap-4 transition-colors hover:text-white"
              >
                <div
                  className="relative w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5"
                  style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}
                >
                  {project.thumbnail && (
                    <CldImage
                      src={project.thumbnail.cloudinaryPublicId}
                      alt=""
                      fill
                      crop={
                        project.thumbnail.crop
                          ? { type: "crop", ...project.thumbnail.crop }
                          : undefined
                      }
                      sizes="80px"
                      className="object-cover"
                    />
                  )}
                </div>
                <div>
                  <p className="font-serif text-sm">{project.title}</p>
                  <p className="font-serif text-xs text-white/50">
                    {formatEventDate(project)}
                  </p>
                </div>
              </Link>
              <div className="flex flex-col items-center gap-1.5">
                <Label
                  htmlFor={`published-${project.slug}`}
                  className="text-xs text-white/70"
                >
                  {project.published ? "Publisert" : "Publiser"}
                </Label>
                <Switch
                  id={`published-${project.slug}`}
                  checked={project.published}
                  disabled={togglingSlug === project.slug}
                  onCheckedChange={() => togglePublished(project)}
                  className="data-checked:bg-emerald-500 data-unchecked:bg-destructive"
                />
              </div>
            </li>
          ))}
          {projects.length === 0 && (
            <p className="font-serif text-sm text-white/50">
              Ingen prosjekter ennå.
            </p>
          )}
        </ul>
      )}
      {toggleError && (
        <p className="mt-4 text-sm text-destructive">{toggleError}</p>
      )}
    </div>
  );
}
