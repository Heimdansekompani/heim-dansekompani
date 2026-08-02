"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ColorFieldProps {
  label: string;
  // null = no color chosen (transparent / site default).
  value: string | null;
  onChange: (value: string | null) => void;
}

// Shared picker for optional colors (section background, page background):
// a native color input plus an explicit "none" state — a color input alone
// can't express "no color", so clearing is a separate button.
export function ColorField({ label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={label}
          value={value ?? "#000000"}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-white/20 bg-transparent"
        />
        <span className="font-serif text-xs text-white/50">
          {value ?? "Ingen"}
        </span>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(null)}
          >
            Fjern
          </Button>
        )}
      </div>
    </div>
  );
}
