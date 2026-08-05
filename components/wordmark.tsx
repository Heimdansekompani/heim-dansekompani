import { LogoMark } from "@/components/logo-mark";
import { cn } from "@/lib/utils";

const SIZE = {
  default: {
    heim: "text-3xl font-semibold",
    dansekompani: "mr-[-0.02em] text-sm tracking-[0.06em]",
  },
  sm: {
    heim: "text-2xl",
    dansekompani: "mt-0.5 mr-[-0.02em] text-xs tracking-[0.06em]",
  },
} as const;

interface WordmarkProps {
  size?: keyof typeof SIZE;
  // Shows the icon (components/logo-mark.tsx) to the left — used in the
  // navbar and footer, omitted in the hamburger sheet where the icon
  // already sits next to the trigger button.
  withLogo?: boolean;
  className?: string;
}

// The site wordmark: "HEIM" over "Dansekompani". Used standalone (hamburger
// sheet) or beside the icon (navbar, footer).
//
// "HEIM"'s rule can't be a plain `underline` on tracked text: letter-
// spacing adds a trailing gap after the last glyph too, which a native
// underline (text-decoration) paints across, overhanging past the "M".
// Splitting the last letter into its own untracked span and drawing the
// rule as a border-bottom on the wrapping box instead fixes both problems
// at once — the border stops exactly at the box's own edge (no trailing
// gap included in its width), and it's one continuous line regardless of
// how the children inside are split (unlike text-decoration, which paints
// a separate segment per flex item).
export function Wordmark({
  size = "default",
  withLogo = false,
  className,
}: WordmarkProps) {
  const sizes = SIZE[size];

  return (
    <span className={cn("flex items-center gap-3", className)}>
      {withLogo && <LogoMark className="h-14 w-14" />}
      {/* items-start: flex-col's default (stretch) would widen the shorter
          "HEIM" row to match "Dansekompani"'s width, dragging its
          border-bottom out past the "M" with it. */}
      <span className="flex flex-col items-start leading-none">
        <span
          className={cn(
            "flex border-b-[0.05em] border-current pb-[0.1em] font-serif",
            sizes.heim,
          )}
        >
          <span className="tracking-[0.25em]">HEI</span>
          <span className=" ">M</span>
        </span>
        <span className={cn("font-serif", sizes.dansekompani)}>
          Dansekompani
        </span>
      </span>
    </span>
  );
}
