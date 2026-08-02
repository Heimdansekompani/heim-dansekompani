import type { CloudinaryCropRect } from "@/lib/cloudinary";

// Width/height ratio every portrait is cropped to at upload time (via the
// Cloudinary widget's interactive cropping tool), so every person's photo
// displays at the same shape regardless of the source image's dimensions.
// Shared by the upload widget config and every display box (admin + public).
export const PORTRAIT_ASPECT_RATIO = 4 / 5;

// Keeps bios to roughly a short paragraph so a long one can't blow out the
// layout next to the portrait. Enforced both as the Textarea's maxLength
// (admin) and shown as a live counter so the limit is visible while typing.
export const BIO_MAX_LENGTH = 600;

export interface PersonImage {
  cloudinaryPublicId: string;
  url: string;
  width: number;
  height: number;
  // The Cloudinary upload widget's cropping step only records the selected
  // rectangle as metadata on the original asset — it doesn't bake the crop
  // into the stored image. This is applied as an explicit crop
  // transformation at render time (see PersonCard) so it's actually
  // reflected in what gets displayed.
  crop?: CloudinaryCropRect;
}

export interface PersonSocialLink {
  label: string;
  url: string;
}

export interface PersonEntry {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: PersonImage | null;
  socialLink: PersonSocialLink | null;
}

export function createEmptyPerson(): PersonEntry {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "",
    bio: "",
    image: null,
    socialLink: null,
  };
}
