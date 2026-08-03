"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { type AdminRole } from "@/contexts/current-admin-context";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
}

const ROLE_OPTIONS: { value: Exclude<AdminRole, null>; label: string }[] = [
  { value: "pending", label: "Venter på godkjenning" },
  { value: "employee", label: "Ansatt" },
  { value: "editor", label: "Redaktør" },
  { value: "admin", label: "Administrator" },
];

export default function AdministratorerPage() {
  const { user, role: currentRole } = useCurrentAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(
        snapshot.docs.map((document) => ({
          id: document.id,
          name: (document.data().name as string) ?? "",
          email: (document.data().email as string) ?? "",
          role: (document.data().role as AdminRole) ?? "pending",
        })),
      );
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function changeRole(uid: string, role: AdminRole) {
    setSavingId(uid);
    try {
      await updateDoc(doc(db, "users", uid), { role });
    } finally {
      setSavingId(null);
    }
  }

  if (currentRole !== "admin") {
    return (
      <p className="font-serif text-sm text-white/50">
        Denne siden er kun tilgjengelig for administratorer.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-2xl tracking-wide">Administratorer</h1>
      {loading ? (
        <p className="mt-8 font-serif text-sm text-white/50">Laster …</p>
      ) : (
        <ul className="mt-8 flex flex-col gap-4">
          {users.map((adminUser) => {
            const isSelf = adminUser.id === user?.uid;
            return (
              <li
                key={adminUser.id}
                className="flex items-center justify-between gap-4 border-b border-white/10 pb-4"
              >
                <p className="font-serif text-sm">
                  {adminUser.name || adminUser.email}
                  {isSelf && <span className="ml-2 text-white/50">(deg)</span>}
                </p>
                <select
                  value={adminUser.role ?? "pending"}
                  disabled={isSelf || savingId === adminUser.id}
                  onChange={(event) =>
                    changeRole(adminUser.id, event.target.value as AdminRole)
                  }
                  className={cn(
                    "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option
                      key={option.value}
                      value={option.value}
                      className="bg-black"
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
          {users.length === 0 && (
            <p className="font-serif text-sm text-white/50">
              Ingen brukere ennå.
            </p>
          )}
        </ul>
      )}
    </div>
  );
}
