"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { createEmptyPerson, type PersonEntry } from "@/lib/person";
import { requestRevalidate } from "@/lib/revalidate-client";
import { Button } from "@/components/ui/button";
import { PersonEditor } from "@/components/admin/person-editor";
import { SaveBar, type SaveStatus } from "@/components/admin/save-bar";

export default function AdminPersonerPage() {
  const { user } = useCurrentAdmin();
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "settings", "personer"),
      (snapshot) => {
        const data = snapshot.data();
        const loaded = Array.isArray(data?.people) ? data.people : [];
        setPeople(loaded);
        setSavedSnapshot(JSON.stringify(loaded));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  const isDirty = JSON.stringify(people) !== savedSnapshot;
  const status: SaveStatus = saving
    ? "saving"
    : error
      ? "error"
      : isDirty
        ? "dirty"
        : "clean";
  const { dialog: unsavedChangesDialog } = useUnsavedChangesGuard(isDirty);

  function addPerson() {
    setPeople((prev) => [...prev, createEmptyPerson()]);
  }

  function updatePerson(id: string, updated: PersonEntry) {
    setPeople((prev) => prev.map((p) => (p.id === id ? updated : p)));
  }

  function removePerson(id: string) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  function movePerson(index: number, direction: -1 | 1) {
    setPeople((prev) => {
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

    if (people.some((person) => !person.name.trim())) {
      setError("Alle personer må ha et navn.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "settings", "personer"), {
        people,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });
      setSavedSnapshot(JSON.stringify(people));
      requestRevalidate("personer-content");
    } catch {
      setError("Noe gikk galt under lagring. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">Personer</h1>

      {loading ? (
        <p className="mt-8 font-serif text-sm text-white/50">Laster …</p>
      ) : (
        <div className="mt-8 flex flex-col gap-4">
          {people.map((person, index) => (
            <PersonEditor
              key={person.id}
              person={person}
              index={index}
              total={people.length}
              onChange={(updated) => updatePerson(person.id, updated)}
              onRemove={() => removePerson(person.id)}
              onMoveUp={() => movePerson(index, -1)}
              onMoveDown={() => movePerson(index, 1)}
            />
          ))}
          <Button type="button" variant="outline" onClick={addPerson}>
            Legg til person
          </Button>
        </div>
      )}

      {!loading && (
        <SaveBar status={status} errorMessage={error} onSave={handleSave} />
      )}
      {unsavedChangesDialog}
    </div>
  );
}
