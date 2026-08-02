"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { CldImage, CldUploadWidget } from "next-cloudinary";

import { db } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { extractCloudinaryCrop } from "@/lib/cloudinary";
import {
  cloneSection,
  createEmptySection,
  normalizeSections,
  visibleBlocks,
  THUMBNAIL_ASPECT_RATIO,
  type Project,
  type ProjectSectionData,
  type ProjectThumbnail,
} from "@/lib/project";
import { isValidHexColor } from "@/lib/rich-text-constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ColorField } from "@/components/admin/color-field";
import { SectionEditor } from "@/components/admin/section-editor";
import { SectionPreview } from "@/components/admin/section-preview";
import { SaveBar, type SaveStatus } from "@/components/admin/save-bar";

// How long the destructive confirm button stays disabled after the dialog
// opens — a deliberate delay so a reflexive click can't complete the
// deletion before it registers what it's confirming.
const DELETE_CONFIRM_DELAY_SECONDS = 3;

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

// Matches combining diacritical marks (U+0300–U+036F) left behind after
// NFD-normalizing accented characters, e.g. "å" -> "a" + U+030A.
const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function timestampToDateInputValue(timestamp: Timestamp | undefined): string {
  if (!timestamp) return "";
  return timestamp.toDate().toISOString().slice(0, 10);
}

interface ProjectFormProps {
  mode: "create" | "edit";
  slug?: string;
  initialProject?: Project;
}

export function ProjectForm({ mode, slug, initialProject }: ProjectFormProps) {
  const router = useRouter();
  const { user } = useCurrentAdmin();
  // The slug the Firestore doc actually lives under right now — null until
  // the first successful save. The slug *input* can keep changing (it
  // re-derives from the title), so on save we compare against this to
  // detect a rename and move the doc instead of writing/reading the wrong
  // path.
  const [currentDocId, setCurrentDocId] = useState<string | null>(
    mode === "edit" ? (slug ?? null) : null,
  );

  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [slugValue, setSlugValue] = useState(slug ?? "");
  // Not seeded from `mode` — even in edit mode the slug should keep
  // following the title (see handleTitleChange). It only ever gets set via
  // direct manual edits to the slug field, which create mode allows.
  const [slugTouched, setSlugTouched] = useState(false);
  const [eventDate, setEventDate] = useState(
    timestampToDateInputValue(initialProject?.eventDate),
  );
  const [published, setPublished] = useState(
    initialProject?.published ?? false,
  );
  // Normalized before both the state and the saved snapshot are seeded —
  // normalizeSections is deterministic, so loading an untouched (even
  // legacy-format) project must not look dirty.
  const [sections, setSections] = useState<ProjectSectionData[]>(() =>
    normalizeSections(initialProject?.sections ?? []),
  );
  const [pageBackground, setPageBackground] = useState<string | null>(() =>
    isValidHexColor(initialProject?.pageBackground)
      ? initialProject.pageBackground
      : null,
  );
  const [thumbnail, setThumbnail] = useState<ProjectThumbnail | null>(
    initialProject?.thumbnail ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      title: initialProject?.title ?? "",
      slug: slug ?? "",
      eventDate: timestampToDateInputValue(initialProject?.eventDate),
      published: initialProject?.published ?? false,
      sections: normalizeSections(initialProject?.sections ?? []),
      pageBackground: isValidHexColor(initialProject?.pageBackground)
        ? initialProject.pageBackground
        : null,
      thumbnail: initialProject?.thumbnail ?? null,
    }),
  );

  const currentSnapshot = JSON.stringify({
    title,
    slug: slugValue,
    eventDate,
    published,
    sections,
    pageBackground,
    thumbnail,
  });
  const isDirty = currentSnapshot !== savedSnapshot;
  const status: SaveStatus = submitting
    ? "saving"
    : error
      ? "error"
      : isDirty
        ? "dirty"
        : "clean";
  const { dialog: unsavedChangesDialog } = useUnsavedChangesGuard(isDirty);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCountdown, setDeleteCountdown] = useState(
    DELETE_CONFIRM_DELAY_SECONDS,
  );
  const [deleting, setDeleting] = useState(false);

  // The countdown itself is armed on open (see handleDeleteDialogOpenChange)
  // — this effect only owns the ticking, so re-opening after a cancel starts
  // a fresh delay instead of reusing a stale timer.
  useEffect(() => {
    if (!deleteDialogOpen) return;
    const interval = setInterval(() => {
      setDeleteCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteDialogOpen]);

  function handleDeleteDialogOpenChange(open: boolean) {
    setDeleteDialogOpen(open);
    if (open) setDeleteCountdown(DELETE_CONFIRM_DELAY_SECONDS);
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlugValue(slugify(value));
  }

  function addSection() {
    setSections((prev) => [...prev, createEmptySection()]);
  }

  function updateSection(id: string, updated: ProjectSectionData) {
    setSections((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }

  function removeSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
  }

  function duplicateSection(index: number) {
    setSections((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, cloneSection(prev[index]));
      return next;
    });
  }

  function moveSection(index: number, direction: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setError(null);

    if (!user) return;
    if (!title.trim()) {
      setError("Prosjektet må ha en tittel.");
      return;
    }
    if (!slugValue.trim()) {
      setError("Prosjektet må ha en slug.");
      return;
    }
    if (!eventDate) {
      setError("Velg en dato for arrangementet.");
      return;
    }
    if (sections.length === 0) {
      setError("Legg til minst én seksjon.");
      return;
    }
    if (
      sections.some((section) =>
        visibleBlocks(section).some(
          (block) => block.kind === "media" && block.items.length === 0,
        ),
      )
    ) {
      setError("Alle synlige bilde-/videoblokker må ha innhold.");
      return;
    }

    setSubmitting(true);
    try {
      const eventTimestamp = Timestamp.fromDate(new Date(eventDate));
      const desiredDocId = slugValue.trim();

      if (!currentDocId || desiredDocId !== currentDocId) {
        // First save, or the title-derived slug changed since the last one
        // — either way this is a new doc path, so make sure nothing else is
        // already using it before writing there.
        const collision = await getDoc(doc(db, "projects", desiredDocId));
        if (collision.exists()) {
          setError(
            "Denne sluggen / URL-en er allerede i bruk av et annet prosjekt.",
          );
          return;
        }

        // Only resolved on the very first save — a rename of an already
        // created project falls into this same branch (new doc path), but
        // should keep the original author, not reassign it to whoever's
        // renaming it.
        const createdByName =
          initialProject?.createdByName ??
          (await getDoc(doc(db, "users", user.uid))).data()?.name ??
          "Ukjent";

        await setDoc(doc(db, "projects", desiredDocId), {
          title: title.trim(),
          slug: desiredDocId,
          published,
          eventDate: eventTimestamp,
          thumbnail,
          sections,
          pageBackground,
          createdAt: initialProject?.createdAt ?? serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: initialProject?.createdBy ?? user.uid,
          createdByName,
        });

        // A rename (as opposed to the very first save) leaves a doc behind
        // at the old path — this is a move, not a copy.
        if (currentDocId) {
          await deleteDoc(doc(db, "projects", currentDocId));
          router.replace(`/admin/prosjekter/${desiredDocId}`);
        }
        setCurrentDocId(desiredDocId);
      } else {
        await updateDoc(doc(db, "projects", currentDocId), {
          title: title.trim(),
          published,
          eventDate: eventTimestamp,
          thumbnail,
          sections,
          pageBackground,
          updatedAt: serverTimestamp(),
        });
      }

      setSavedSnapshot(currentSnapshot);
    } catch {
      setError("Noe gikk galt under lagring. Prøv igjen.");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteProject() {
    if (!currentDocId) return;

    setDeleting(true);
    try {
      await deleteDoc(doc(db, "projects", currentDocId));
      router.push("/admin/prosjekter");
    } catch {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setError("Kunne ikke slette prosjektet. Prøv igjen.");
    }
  }

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
        className="flex flex-col gap-8"
      >
        <div className="flex flex-wrap gap-6">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Tittel</Label>
            <Input
              id="title"
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="slug">Slug / URL</Label>
            <Input
              id="slug"
              value={slugValue}
              onChange={(event) => {
                setSlugTouched(true);
                setSlugValue(slugify(event.target.value));
              }}
              disabled={true}
              required
            />
            {mode === "edit" && (
              <p className="font-serif text-xs text-white/50">
                Følger tittelen automatisk.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="eventDate">Dato</Label>
            <Input
              id="eventDate"
              type="date"
              value={eventDate}
              onChange={(event) => setEventDate(event.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="published">
              {published ? "Publisert" : "Publiser"}
            </Label>
            <Switch
              id="published"
              checked={published}
              onCheckedChange={setPublished}
              className="data-checked:bg-emerald-500 data-unchecked:bg-destructive"
            />
          </div>
          <ColorField
            label="Sidebakgrunn"
            value={pageBackground}
            onChange={setPageBackground}
          />
        </div>

        <div>
          <Label>Thumbnail</Label>
          <p className="mt-1 font-serif text-sm text-white/50">
            Vises i prosjektoversikten på nettsiden.
          </p>
          <div className="mt-2 flex items-center gap-4">
            <div
              className="relative w-32 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5"
              style={{ aspectRatio: THUMBNAIL_ASPECT_RATIO }}
            >
              {thumbnail && (
                <CldImage
                  src={thumbnail.cloudinaryPublicId}
                  alt=""
                  width={thumbnail.width}
                  height={thumbnail.height}
                  crop={
                    thumbnail.crop
                      ? { type: "crop", ...thumbnail.crop }
                      : undefined
                  }
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              options={{
                cloudName: CLOUD_NAME,
                apiKey: API_KEY,
                sources: ["local", "url", "camera"],
                multiple: false,
                resourceType: "image",
                folder: "prosjekter",
                cropping: true,
                croppingAspectRatio: THUMBNAIL_ASPECT_RATIO,
                croppingShowDimensions: true,
                showSkipCropButton: false,
              }}
              onSuccess={(result) => {
                const info = result.info;
                if (!info || typeof info === "string") return;
                const crop = extractCloudinaryCrop(info.coordinates);
                setThumbnail({
                  cloudinaryPublicId: info.public_id,
                  url: info.secure_url,
                  width: crop?.width ?? info.width,
                  height: crop?.height ?? info.height,
                  ...(crop ? { crop } : {}),
                });
              }}
            >
              {({ open }) => (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => open()}
                >
                  {thumbnail ? "Bytt bilde" : "Last opp bilde"}
                </Button>
              )}
            </CldUploadWidget>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sections.map((section, index) => (
            <SectionEditor
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onChange={(updated) => updateSection(section.id, updated)}
              onRemove={() => removeSection(section.id)}
              onMoveUp={() => moveSection(index, -1)}
              onMoveDown={() => moveSection(index, 1)}
              onDuplicate={() => duplicateSection(index)}
            />
          ))}
          <Button type="button" variant="outline" onClick={addSection}>
            Legg til seksjon
          </Button>
        </div>

        {mode === "edit" && currentDocId && (
          <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <p className="font-serif text-sm text-white/70">
              Sletter prosjektet permanent. Dette kan ikke angres.
            </p>
            <AlertDialog
              open={deleteDialogOpen}
              onOpenChange={handleDeleteDialogOpenChange}
            >
              <AlertDialogTrigger
                render={<Button type="button" variant="destructive" size="sm" />}
              >
                Slett prosjekt
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Slette «{title}»?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Dette kan ikke angres. Prosjektet fjernes permanent fra
                    nettsiden.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Avbryt</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={deleteCountdown > 0 || deleting}
                    onClick={deleteProject}
                  >
                    {deleting
                      ? "Sletter …"
                      : deleteCountdown > 0
                        ? `Slett prosjekt (${deleteCountdown})`
                        : "Slett prosjekt"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        <SaveBar
          status={status}
          errorMessage={error}
          onSave={save}
          onPreview={() => setPreviewOpen(true)}
        />
      </form>
      {previewOpen && (
        <SectionPreview
          sections={sections}
          pageBackground={pageBackground}
          title={title || "Uten tittel"}
          subtitle={
            eventDate
              ? new Date(eventDate).toLocaleDateString("nb-NO", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : undefined
          }
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {unsavedChangesDialog}
    </>
  );
}
