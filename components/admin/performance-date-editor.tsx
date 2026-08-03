"use client";

import { Trash2 } from "lucide-react";

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
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from "@/components/ui/number-field";

// The form's working representation of a performance date — date and time as
// the native inputs' string values (converted to a Timestamp on save, same
// pattern as the eventDate field). Plain JSON, so the host form's
// JSON.stringify dirty-tracking works unchanged. `price` isn't editable yet
// (reserved for the future Vipps step) but is carried through saves.
export interface PerformanceDateDraft {
  id: string;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm"
  location: string;
  capacity: number;
  price: number | null;
}

interface PerformanceDateEditorProps {
  date: PerformanceDateDraft;
  index: number;
  // Tickets already reserved for this date (from the attendance counter);
  // null while unknown (loading, or a not-yet-saved date).
  taken: number | null;
  onChange: (date: PerformanceDateDraft) => void;
  onRemove: () => void;
}

// The native pickers only open from the calendar/clock icon, which browsers
// draw black (invisible on the dark theme). Invert the icon and open the
// picker from a click anywhere in the field. (Same trick as the project
// form's eventDate input.)
const PICKER_INPUT_CLASS =
  "cursor-pointer [&::-webkit-calendar-picker-indicator]:invert";

function openPicker(event: React.MouseEvent<HTMLInputElement>) {
  try {
    event.currentTarget.showPicker();
  } catch {
    // Unsupported browser: segment editing still works.
  }
}

export function PerformanceDateEditor({
  date,
  index,
  taken,
  onChange,
  onRemove,
}: PerformanceDateEditorProps) {
  const hasRegistrations = taken !== null && taken > 0;

  return (
    <div className="rounded-lg border border-white/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-serif text-sm text-white/50">
          Forestilling {index + 1}
          {taken !== null && (
            <span>
              {" — "}
              {taken} av {date.capacity} billetter reservert
            </span>
          )}
        </p>
        {hasRegistrations ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Fjern forestilling"
                />
              }
            >
              <Trash2 className="h-4 w-4" />
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Fjerne forestillingen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Det finnes {taken} reserverte billetter til denne datoen.
                  Fjerner du den, forsvinner datoen fra påmeldingssiden, men
                  påmeldingene beholdes og vises under «Slettet dato» i
                  påmeldingsoversikten.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={onRemove}>
                  Fjern forestilling
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Fjern forestilling"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`date-${date.id}`}>Dato</Label>
          <Input
            id={`date-${date.id}`}
            type="date"
            value={date.date}
            onChange={(event) => onChange({ ...date, date: event.target.value })}
            className={PICKER_INPUT_CLASS}
            onClick={openPicker}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`time-${date.id}`}>Tidspunkt</Label>
          <Input
            id={`time-${date.id}`}
            type="time"
            value={date.time}
            onChange={(event) => onChange({ ...date, time: event.target.value })}
            className={PICKER_INPUT_CLASS}
            onClick={openPicker}
          />
        </div>
        <div className="flex min-w-40 flex-1 flex-col gap-1.5">
          <Label htmlFor={`location-${date.id}`}>Sted</Label>
          <Input
            id={`location-${date.id}`}
            value={date.location}
            onChange={(event) =>
              onChange({ ...date, location: event.target.value })
            }
            placeholder="F.eks. Kulturhuset, Storsalen"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`capacity-${date.id}`}>Kapasitet</Label>
          <NumberField
            value={date.capacity}
            min={1}
            step={1}
            onValueChange={(value) => {
              if (value === null) return;
              onChange({ ...date, capacity: Math.max(1, Math.round(value)) });
            }}
          >
            <NumberFieldGroup>
              <NumberFieldDecrement>-</NumberFieldDecrement>
              <NumberFieldInput id={`capacity-${date.id}`} />
              <NumberFieldIncrement>+</NumberFieldIncrement>
            </NumberFieldGroup>
          </NumberField>
        </div>
      </div>
    </div>
  );
}
