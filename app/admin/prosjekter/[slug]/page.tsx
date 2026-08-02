"use client";

import { use, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { Project } from "@/lib/project";
import { ProjectForm } from "@/components/admin/project-form";

export default function RedigerProsjektPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    getDoc(doc(db, "projects", slug)).then((snapshot) => {
      if (cancelled) return;
      setProject(snapshot.exists() ? (snapshot.data() as Project) : null);
    });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (project === undefined) {
    return <p className="font-serif text-sm text-white/50">Laster …</p>;
  }

  if (project === null) {
    return (
      <p className="font-serif text-sm text-white/50">Fant ikke prosjektet.</p>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">{project.title}</h1>
      <div className="mt-8">
        <ProjectForm mode="edit" slug={slug} initialProject={project} />
      </div>
    </div>
  );
}
