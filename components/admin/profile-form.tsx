"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { CldImage, CldUploadWidget } from "next-cloudinary";

import { db } from "@/lib/firebase";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes-guard";
import { extractCloudinaryCrop } from "@/lib/cloudinary";
import {
  AVATAR_ASPECT_RATIO,
  createEmptyAddress,
  type UserPhoto,
  type UserProfile,
} from "@/lib/user-profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveBar, type SaveStatus } from "@/components/admin/save-bar";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;

interface ProfileFormProps {
  uid: string;
  profile: UserProfile;
}

export function ProfileForm({ uid, profile }: ProfileFormProps) {
  const [name, setName] = useState(profile.name);
  const [address, setAddress] = useState(
    profile.address ?? createEmptyAddress(),
  );
  const [photo, setPhoto] = useState<UserPhoto | null>(profile.photo);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState(() =>
    JSON.stringify({
      name: profile.name,
      address: profile.address,
      photo: profile.photo,
    }),
  );

  const currentSnapshot = JSON.stringify({ name, address, photo });
  const isDirty = currentSnapshot !== savedSnapshot;
  const status: SaveStatus = saving
    ? "saving"
    : error
      ? "error"
      : isDirty
        ? "dirty"
        : "clean";
  const { dialog: unsavedChangesDialog } = useUnsavedChangesGuard(isDirty);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), { name, address, photo });
      setSavedSnapshot(currentSnapshot);
    } catch {
      setError("Noe gikk galt under lagring. Prøv igjen.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex flex-col items-start gap-2">
        <Label>Profilbilde</Label>
        <div
          className="relative w-24 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5"
          style={{ aspectRatio: AVATAR_ASPECT_RATIO }}
        >
          {photo && (
            <CldImage
              src={photo.cloudinaryPublicId}
              alt=""
              width={photo.width}
              height={photo.height}
              crop={photo.crop ? { type: "crop", ...photo.crop } : undefined}
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
            folder: "profilbilder",
            // Every profile picture is cropped square at upload time, same
            // reasoning as PersonEditor's locked portrait ratio — skipping
            // is disabled so this can't be bypassed.
            cropping: true,
            croppingAspectRatio: AVATAR_ASPECT_RATIO,
            croppingShowDimensions: true,
            showSkipCropButton: false,
          }}
          onSuccess={(result) => {
            const info = result.info;
            if (!info || typeof info === "string") return;
            const crop = extractCloudinaryCrop(info.coordinates);
            setPhoto({
              cloudinaryPublicId: info.public_id,
              url: info.secure_url,
              width: crop?.width ?? info.width,
              height: crop?.height ?? info.height,
              ...(crop ? { crop } : {}),
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
              {photo ? "Bytt bilde" : "Last opp bilde"}
            </Button>
          )}
        </CldUploadWidget>
      </div>

      <div className="mt-6 flex flex-col gap-1.5">
        <Label htmlFor="name">Navn</Label>
        <Input
          id="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="street">Gateadresse</Label>
          <Input
            id="street"
            value={address.street}
            onChange={(event) =>
              setAddress({ ...address, street: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="postalCode">Postnummer</Label>
          <Input
            id="postalCode"
            value={address.postalCode}
            onChange={(event) =>
              setAddress({ ...address, postalCode: event.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="city">Poststed</Label>
          <Input
            id="city"
            value={address.city}
            onChange={(event) =>
              setAddress({ ...address, city: event.target.value })
            }
          />
        </div>
      </div>

      <SaveBar status={status} errorMessage={error} onSave={handleSave} />
      {unsavedChangesDialog}
    </div>
  );
}
