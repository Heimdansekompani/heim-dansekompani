import type { Timestamp } from "firebase/firestore";

import type { CloudinaryCropRect } from "@/lib/cloudinary";

// Profile pictures are cropped square, unlike the 4:5 team portraits — this
// is a personal avatar, not a page laid out around a fixed photo shape.
export const AVATAR_ASPECT_RATIO = 1;

export interface UserAddress {
  street: string;
  postalCode: string;
  city: string;
}

export interface UserPhoto {
  cloudinaryPublicId: string;
  url: string;
  width: number;
  height: number;
  // See ProjectMediaCrop/PersonImage — the upload widget's crop step only
  // records the selected rectangle as metadata, so it's re-applied as an
  // explicit crop transformation at render time.
  crop?: CloudinaryCropRect;
}

export interface UserProfile {
  email: string;
  name: string;
  address: UserAddress | null;
  photo: UserPhoto | null;
  // Only set for accounts created after this field was introduced —
  // Firebase Auth's own user.metadata.creationTime is the fallback for
  // older accounts.
  createdAt: Timestamp | null;
}

export function createEmptyAddress(): UserAddress {
  return { street: "", postalCode: "", city: "" };
}
