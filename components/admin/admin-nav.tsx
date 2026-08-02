"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { href: "/admin", label: "Min profil", adminOnly: false },
  { href: "/admin/om", label: "Om", adminOnly: false },
  { href: "/admin/personer", label: "Personer", adminOnly: false },
  { href: "/admin/prosjekter", label: "Prosjekter", adminOnly: false },
  { href: "/admin/administratorer", label: "Administratorer", adminOnly: true },
];

export function AdminNav() {
  const pathname = usePathname();
  const { role } = useCurrentAdmin();

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
      <ul className="flex flex-wrap items-center gap-6">
        {adminNavItems
          .filter((item) => !item.adminOnly || role === "admin")
          .map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "font-serif text-sm tracking-wide text-white/70 transition-colors hover:text-white",
                    active && "text-white",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
      </ul>
      <Button variant="ghost" size="sm" onClick={() => signOut(auth)}>
        Logg ut
      </Button>
    </div>
  );
}
