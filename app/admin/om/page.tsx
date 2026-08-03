"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import {
  cloneSection,
  createEmptySection,
  normalizeSections,
  type ProjectSectionData,
} from "@/lib/project";
import { requestRevalidate } from "@/lib/revalidate-client";
import { isValidHexColor } from "@/lib/rich-text-constants";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/admin/color-field";
import { SectionEditor } from "@/components/admin/section-editor";
import { SectionPreview } from "@/components/admin/section-preview";
import { SaveBar, type SaveStatus } from "@/components/admin/save-bar";

export default function AdminOmPage() {
  const { user } = useCurrentAdmin();
  const [sections, setSections] = useState<ProjectSectionData[]>([]);
  const [pageBackground, setPageBackground] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", "om"), (snapshot) => {
      const data = snapshot.data();
      // normalizeSections is deterministic, so loading an untouched document
      // must yield the exact snapshot string — no phantom dirty state.
      const loaded = normalizeSections(data?.sections);
      const background = isValidHexColor(data?.pageBackground)
        ? data.pageBackground
        : null;
      setSections(loaded);
      setPageBackground(background);
      setSavedSnapshot(
        JSON.stringify({ sections: loaded, pageBackground: background }),
      );
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isDirty =
    JSON.stringify({ sections, pageBackground }) !== savedSnapshot;
  const status: SaveStatus = saving
    ? "saving"
    : error
      ? "error"
      : isDirty
        ? "dirty"
        : "clean";
  const { dialog: unsavedChangesDialog } = useUnsavedChangesGuard(isDirty);

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

  async function handleSave() {
    if (!user) return;
    setError(null);

    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "om"), {
        sections,
        pageBackground,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setSavedSnapshot(JSON.stringify({ sections, pageBackground }));
      requestRevalidate("om-content");
    } catch {
      setError("Noe gikk galt under lagring. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">Om</h1>

      {loading ? (
        <p className="mt-8 font-serif text-sm text-white/50">Laster …</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          <ColorField
            label="Sidebakgrunn"
            value={pageBackground}
            onChange={setPageBackground}
          />
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
      )}

      {!loading && (
        <SaveBar
          status={status}
          errorMessage={error}
          onSave={handleSave}
          onPreview={() => setPreviewOpen(true)}
        />
      )}
      {previewOpen && (
        <SectionPreview
          sections={sections}
          pageBackground={pageBackground}
          title="Om oss"
          contentClassName="font-serif text-base leading-relaxed text-white/80 @2xl:text-lg"
          onClose={() => setPreviewOpen(false)}
        />
      )}
      {unsavedChangesDialog}
    </div>
  );
}


