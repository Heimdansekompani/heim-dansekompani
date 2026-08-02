"use client";

import Link from "next/link";
import { Pencil } from "lucide-react";

import { isEditorOrAbove, useCurrentAdmin } from "@/hooks/use-current-admin";
import { Button } from "@/components/ui/button";

// Only rendered for signed-in editors/admins — everyone else (including
// anonymous visitors) gets nothing, not even a hidden element.
export function EditProjectLink({ slug }: { slug: string }) {
  const { role } = useCurrentAdmin();
  if (!isEditorOrAbove(role)) return null;

  return (
    <Button
      render={<Link href={`/admin/prosjekter/${slug}`} />}
      nativeButton={false}
      variant="outline"
      size="sm"
    >
      <Pencil className="h-4 w-4" />
      Rediger prosjekt
    </Button>
  );
}
