"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { CldImage, CldUploadWidget } from "next-cloudinary";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractCloudinaryCrop } from "@/lib/cloudinary";
import {
  BIO_MAX_LENGTH,
  PORTRAIT_ASPECT_RATIO,
  type PersonEntry,
} from "@/lib/person";
import { cn } from "@/lib/utils";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

interface PersonEditorProps {
  person: PersonEntry;
  index: number;
  total: number;
  onChange: (person: PersonEntry) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function PersonEditor({
  person,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: PersonEditorProps) {
  const hasSocialLink = person.socialLink !== null;

  // The Cloudinary upload widget is created once and keeps calling whichever
  // onSuccess closure existed at that moment, ignoring later re-renders — so
  // reading `person` there directly would silently discard any edits made
  // after the widget was created. Routing through a ref that's always
  // up to date works around it.
  const personRef = useRef(person);
  useEffect(() => {
    personRef.current = person;
  }, [person]);

  return (
    <div className="rounded-lg border border-white/15 p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-serif text-sm text-white/50">Person {index + 1}</p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Flytt opp"
            disabled={index === 0}
            onClick={onMoveUp}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Flytt ned"
            disabled={index === total - 1}
            onClick={onMoveDown}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Fjern person"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex flex-col items-start gap-2">
          <Label>Bilde</Label>
          <div
            className="relative w-24 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-white/5"
            style={{ aspectRatio: PORTRAIT_ASPECT_RATIO }}
          >
            {person.image && (
              <CldImage
                src={person.image.cloudinaryPublicId}
                alt=""
                width={person.image.width}
                height={person.image.height}
                crop={
                  person.image.crop
                    ? { type: "crop", ...person.image.crop }
                    : undefined
                }
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <CldUploadWidget
            signatureEndpoint="/api/cloudinary/sign"
            options={{
              cloudName: CLOUD_NAME,
              apiKey: API_KEY,
              sources: ["local", "url", "camera"],
              multiple: false,
              resourceType: "image",
              folder: "personer",
              // Every portrait is cropped to the same aspect ratio at upload
              // time so the whole team displays consistently regardless of
              // each source photo's original shape. Skipping is disabled so
              // this can't be bypassed.
              cropping: true,
              croppingAspectRatio: PORTRAIT_ASPECT_RATIO,
              croppingShowDimensions: true,
              showSkipCropButton: false,
            }}
            onSuccess={(result) => {
              const info = result.info;
              if (!info || typeof info === "string") return;
              const crop = extractCloudinaryCrop(info.coordinates);
              onChange({
                ...personRef.current,
                image: {
                  cloudinaryPublicId: info.public_id,
                  url: info.secure_url,
                  width: crop?.width ?? info.width,
                  height: crop?.height ?? info.height,
                  ...(crop ? { crop } : {}),
                },
              });
            }}
          >
            {({ open }) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => open()}
              >
                {person.image ? "Bytt bilde" : "Last opp bilde"}
              </Button>
            )}
          </CldUploadWidget>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`name-${person.id}`}>Navn</Label>
              <Input
                id={`name-${person.id}`}
                value={person.name}
                onChange={(event) =>
                  onChange({ ...person, name: event.target.value })
                }
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <Label htmlFor={`role-${person.id}`}>Tittel</Label>
              <Input
                id={`role-${person.id}`}
                value={person.role}
                onChange={(event) =>
                  onChange({ ...person, role: event.target.value })
                }
                placeholder="F.eks. Dansekunstner"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`bio-${person.id}`}>Beskrivelse</Label>
              <span
                className={cn(
                  "text-xs",
                  person.bio.length >= BIO_MAX_LENGTH
                    ? "text-destructive"
                    : "text-white/50",
                )}
              >
                {person.bio.length} / {BIO_MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id={`bio-${person.id}`}
              value={person.bio}
              onChange={(event) =>
                onChange({ ...person, bio: event.target.value })
              }
              maxLength={BIO_MAX_LENGTH}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label>Sosial lenke (valgfritt)</Label>
              {hasSocialLink ? (
                <button
                  type="button"
                  onClick={() => onChange({ ...person, socialLink: null })}
                  className="cursor-pointer text-xs text-white/50 hover:text-white"
                >
                  Fjern lenke
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...person,
                      socialLink: { label: "", url: "" },
                    })
                  }
                  className="cursor-pointer text-xs text-white/50 hover:text-white"
                >
                  Legg til lenke
                </button>
              )}
            </div>
            {hasSocialLink && person.socialLink && (
              <div className="flex flex-wrap gap-2">
                <Input
                  value={person.socialLink.label}
                  onChange={(event) =>
                    onChange({
                      ...person,
                      socialLink: {
                        ...person.socialLink!,
                        label: event.target.value,
                      },
                    })
                  }
                  placeholder="F.eks. Instagram"
                  className="max-w-40"
                />
                <Input
                  value={person.socialLink.url}
                  onChange={(event) =>
                    onChange({
                      ...person,
                      socialLink: {
                        ...person.socialLink!,
                        url: event.target.value,
                      },
                    })
                  }
                  placeholder="https://…"
                  className="flex-1"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
