"use client";

import { Check, LoaderCircle, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type SaveStatus = "clean" | "dirty" | "saving" | "error";

interface SaveBarProps {
  status: SaveStatus;
  errorMessage?: string | null;
  onSave: () => void;
  // Renders a secondary "Forhåndsvis" button when provided.
  onPreview?: () => void;
}

const STATUS_STYLES: Record<SaveStatus, string> = {
  clean: "border-white/10 bg-white/5",
  dirty: "border-amber-400/40 bg-amber-400/10",
  saving: "border-white/10 bg-white/5",
  error: "border-destructive/40 bg-destructive/10",
};

/**
 * A save affordance that's always visible while scrolling a long admin
 * form, rather than a small button easy to lose track of at the top of the
 * page. Color and message make the current state (saved / unsaved changes /
 * saving / failed) obvious at a glance.
 */
export function SaveBar({
  status,
  errorMessage,
  onSave,
  onPreview,
}: SaveBarProps) {
  const message =
    status === "error"
      ? (errorMessage ?? "Kunne ikke lagre. Prøv igjen.")
      : status === "saving"
        ? "Lagrer …"
        : status === "dirty"
          ? "Du har ulagrede endringer."
          : "Alt er lagret.";

  return (
    <div
      className={cn(
        "sticky bottom-4 z-20 mt-8 flex items-center justify-between gap-4 rounded-lg border px-4 py-3 shadow-lg backdrop-blur",
        STATUS_STYLES[status],
      )}
    >
      <p className="flex items-center gap-2 font-serif text-sm text-white/80">
        {status === "saving" && (
          <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
        )}
        {status === "clean" && (
          <Check className="h-4 w-4 shrink-0 text-emerald-400" />
        )}
        {status === "error" && (
          <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
        )}
        {message}
      </p>
      <div className="flex items-center gap-2">
        {onPreview && (
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            Forhåndsvis
          </Button>
        )}
        <Button
          type="button"
          onClick={onSave}
          disabled={status === "saving" || status === "clean"}
          size="sm"
        >
          {status === "saving" ? "Lagrer …" : "Lagre"}
        </Button>
      </div>
    </div>
  );
}
