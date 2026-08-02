export interface CloudinaryCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// The Cloudinary upload widget's cropping step reports the selected
// rectangle as "custom coordinates" metadata (`coordinates.custom`) on the
// original asset rather than baking it into the uploaded image itself — it
// has to be re-applied as an explicit crop transformation wherever the
// image is rendered (see components using CloudinaryCropRect).
export function extractCloudinaryCrop(
  coordinates: unknown,
): CloudinaryCropRect | undefined {
  if (!coordinates || typeof coordinates !== "object") return undefined;
  const custom = (coordinates as { custom?: unknown }).custom;
  if (!Array.isArray(custom) || !Array.isArray(custom[0])) return undefined;

  const [x, y, width, height] = custom[0] as unknown[];
  if (![x, y, width, height].every((value) => typeof value === "number")) {
    return undefined;
  }

  return { x, y, width, height } as CloudinaryCropRect;
}
