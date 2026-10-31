"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { isEditorOrAbove } from "@/contexts/current-admin-context";
import { useCurrentAdmin } from "@/hooks/use-current-admin";
import { Button } from "@/components/ui/button";

// Shortcut from a public page to its admin editor. Only rendered for
// signed-in editors/admins — everyone else (including anonymous visitors)
// gets nothing, not even a hidden element.
export function AdminEditLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const { role } = useCurrentAdmin();
  if (!isEditorOrAbove(role)) return null;

  return (
    <Button
      render={<Link href={href} />}
      nativeButton={false}
      variant="outline"
      size="sm"
    >
      <Pencil className="h-4 w-4" />
      {label}
    </Button>
  );
}
