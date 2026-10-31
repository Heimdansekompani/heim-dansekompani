"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { Search } from "lucide-react";

import { db } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { createEmptyPerson, type PersonEntry } from "@/lib/person";
import { requestRevalidate } from "@/lib/revalidate-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PersonEditor } from "@/components/admin/person-editor";
import { SaveBar, type SaveStatus } from "@/components/admin/save-bar";

export default function AdminPersonerPage() {
  const { user } = useCurrentAdmin();
  const [people, setPeople] = useState<PersonEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [query, setQuery] = useState("");
  // Cards start collapsed so a long roster stays scannable; this tracks
  // which ones the admin has expanded for editing.
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

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

  const normalizedQuery = query.trim().toLowerCase();
  const isFiltering = normalizedQuery.length > 0;
  // Keeps each person's real index alongside them so reorder bounds and
  // move handlers still refer to the full list, not the filtered view.
  const visiblePeople = people
    .map((person, index) => ({ person, index }))
    .filter(
      ({ person }) =>
        !isFiltering ||
        person.name.toLowerCase().includes(normalizedQuery) ||
        person.role.toLowerCase().includes(normalizedQuery),
    );
  const allVisibleOpen =
    visiblePeople.length > 0 &&
    visiblePeople.every(({ person }) => openIds.has(person.id));

  function setOpen(id: string, open: boolean) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setOpenIds((prev) => {
      const next = new Set(prev);
      for (const { person } of visiblePeople) {
        if (allVisibleOpen) next.delete(person.id);
        else next.add(person.id);
      }
      return next;
    });
  }

  function addPerson() {
    const person = createEmptyPerson();
    setPeople((prev) => [...prev, person]);
    setOpen(person.id, true);
    // Otherwise the new, still-unnamed card could be hidden by the filter.
    setQuery("");
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

    const unnamed = people.filter((person) => !person.name.trim());
    if (unnamed.length > 0) {
      setError("Alle personer må ha et navn.");
      // Surface the offending cards — they'd otherwise be collapsed or
      // filtered out of view.
      setQuery("");
      setOpenIds((prev) => {
        const next = new Set(prev);
        for (const person of unnamed) next.add(person.id);
        return next;
      });
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
          {people.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Søk etter navn eller tittel"
                  aria-label="Søk etter personer"
                  className="pl-9"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleAllVisible}
                disabled={visiblePeople.length === 0}
              >
                {allVisibleOpen ? "Lukk alle" : "Åpne alle"}
              </Button>
            </div>
          )}
          {isFiltering && visiblePeople.length === 0 && (
            <p className="font-serif text-sm text-white/50">
              Ingen treff for «{query.trim()}».
            </p>
          )}
          {visiblePeople.map(({ person, index }) => (
            <PersonEditor
              key={person.id}
              person={person}
              index={index}
              total={people.length}
              open={openIds.has(person.id)}
              onOpenChange={(open) => setOpen(person.id, open)}
              reorderDisabled={isFiltering}
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
