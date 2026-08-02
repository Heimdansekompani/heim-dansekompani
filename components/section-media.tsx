"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import AutoScroll from "embla-carousel-auto-scroll";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CldImage,
  CldVideoPlayer,
  getCldImageUrl,
  getCldVideoUrl,
} from "next-cloudinary";

import {
  BLUR_STRENGTH,
  type BlurLevel,
  type ContinuousSpeed,
  type MediaBlock,
  type ProjectMedia,
} from "@/lib/project";
import { cn } from "@/lib/utils";

interface SectionMediaProps {
  block: MediaBlock;
  // Unique per rendered instance — CldVideoPlayer requires a unique DOM id,
  // and the admin preview renders a second copy of the same section on top
  // of the page, so the section/block ids alone aren't enough.
  playerId: string;
  sizes?: string;
}

export function SectionMedia({ block, playerId, sizes }: SectionMediaProps) {
  const { items } = block;
  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <figure className="w-full">
        <SingleMedia
          media={items[0]}
          blur={block.blur}
          playerId={playerId}
          sizes={sizes}
        />
        <Caption text={items[0].caption} />
      </figure>
    );
  }

  return <MediaSlideshow block={block} playerId={playerId} sizes={sizes} />;
}

function Caption({ text }: { text: string | undefined }) {
  if (!text) return null;
  return (
    <figcaption className="mt-2 font-serif text-xs text-white/50">
      {text}
    </figcaption>
  );
}

// One media item rendered on its own terms (natural aspect ratio). When
// `fill` is set the media instead covers its parent — used by slideshow
// slides, which are locked to the first slide's aspect ratio.
function SingleMedia({
  media,
  blur,
  playerId,
  sizes,
  fill = false,
}: {
  media: ProjectMedia;
  blur: BlurLevel;
  playerId: string;
  sizes?: string;
  fill?: boolean;
}) {
  const blurStrength = BLUR_STRENGTH[blur];
  const mediaClass = fill
    ? "h-full w-full object-cover"
    : "h-auto w-full object-cover";

  if (media.type === "image") {
    return (
      <CldImage
        src={media.cloudinaryPublicId}
        alt={media.altText || ""}
        width={media.width}
        height={media.height}
        crop={media.crop ? { type: "crop", ...media.crop } : undefined}
        blur={blurStrength > 0 ? String(blurStrength) : undefined}
        sizes={sizes ?? "(max-width: 672px) 100vw, 50vw"}
        className={mediaClass}
      />
    );
  }

  if (media.playbackMode === "ambient") {
    // Background footage: no player chrome at all — a bare autoplaying,
    // muted loop, with any blur baked into the delivered video URL.
    const src = getCldVideoUrl({
      src: media.cloudinaryPublicId,
      width: media.width,
      height: media.height,
      ...(blurStrength > 0
        ? { rawTransformations: [`e_blur:${blurStrength}`] }
        : {}),
    });
    return (
      <video
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={mediaClass}
      />
    );
  }

  const poster =
    media.posterOffsetSeconds !== undefined
      ? getCldImageUrl({
          src: media.cloudinaryPublicId,
          assetType: "video",
          format: "jpg",
          width: media.width,
          height: media.height,
          rawTransformations: [
            `so_${media.posterOffsetSeconds}`,
            ...(blurStrength > 0 ? [`e_blur:${blurStrength}`] : []),
          ],
        })
      : undefined;

  const player = (
    <CldVideoPlayer
      id={playerId}
      src={media.cloudinaryPublicId}
      width={media.width}
      height={media.height}
      poster={poster}
      transformation={
        blurStrength > 0 ? { effect: `blur:${blurStrength}` } : undefined
      }
    />
  );
  // A player video keeps its own aspect ratio even inside a fill slide —
  // covering would crop away its controls. Center it instead.
  if (!fill) return player;
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="w-full">{player}</div>
    </div>
  );
}

// Pixels per frame for continuous auto-scroll.
const AUTO_SCROLL_SPEED: Record<ContinuousSpeed, number> = {
  slow: 0.5,
  medium: 1,
  fast: 2,
};

// Conservative until measured: no auto-advance on the server render or
// before the media query resolves.
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function MediaSlideshow({ block, playerId, sizes }: SectionMediaProps) {
  const { items, slideshow } = block;
  const prefersReducedMotion = usePrefersReducedMotion();

  // stopOnInteraction: false = an interaction only pauses the movement, so
  // the slideshow rests while the visitor is engaging and resumes afterwards.
  const pauseOptions = {
    stopOnInteraction: false,
    stopOnMouseEnter: true,
    stopOnFocusIn: true,
  } as const;
  const autoplay =
    slideshow.autoAdvance && !prefersReducedMotion
      ? slideshow.advanceMode === "continuous"
        ? [
            AutoScroll({
              speed: AUTO_SCROLL_SPEED[slideshow.continuousSpeed],
              startDelay: 0,
              ...pauseOptions,
            }),
          ]
        : [
            Autoplay({
              delay: slideshow.intervalSeconds * 1000,
              ...pauseOptions,
            }),
          ]
      : [];
  const [viewportRef, emblaApi] = useEmblaCarousel({ loop: true }, autoplay);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelected(emblaApi.selectedScrollSnap());
    onSelect();
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // All slides share the first item's aspect ratio so the layout never jumps
  // mid-transition; other slides cover the box.
  const first = items[0];
  const strip = slideshow.view === "strip";

  return (
    <figure className="w-full">
      <div className="relative">
        <div ref={viewportRef} className="overflow-hidden">
          {/* Strip gutters use the negative-margin + slide-padding Embla
              pattern so the first slide still sits flush with the edge. */}
          <div
            className={cn("flex touch-pan-y", strip && "-ml-2 @2xl:-ml-3")}
          >
            {items.map((media, index) => (
              <div
                key={`${media.cloudinaryPublicId}-${index}`}
                style={
                  {
                    "--ar": `${first.width} / ${first.height}`,
                    "--basis": `calc(100% / ${slideshow.stripSlides})`,
                  } as CSSProperties
                }
                className={cn(
                  "min-w-0 shrink-0 grow-0",
                  strip
                    ? "basis-1/2 pl-2 @2xl:basis-(--basis) @2xl:pl-3"
                    : "basis-full",
                )}
              >
                <div className="aspect-(--ar)">
                  <SingleMedia
                    media={media}
                    blur={block.blur}
                    playerId={`${playerId}-s${index}`}
                    sizes={sizes}
                    fill
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <ArrowButton side="left" label="Forrige bilde" onClick={scrollPrev}>
          <ChevronLeft className="h-5 w-5" />
        </ArrowButton>
        <ArrowButton side="right" label="Neste bilde" onClick={scrollNext}>
          <ChevronRight className="h-5 w-5" />
        </ArrowButton>

        <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
          {items.map((media, index) => (
            <button
              key={`${media.cloudinaryPublicId}-${index}`}
              type="button"
              aria-label={`Gå til bilde ${index + 1}`}
              aria-current={index === selected}
              onClick={() => emblaApi?.scrollTo(index)}
              className={cn(
                "size-2 cursor-pointer rounded-full transition-colors",
                index === selected
                  ? "bg-white"
                  : "bg-white/40 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      </div>
      <Caption text={items[selected]?.caption} />
    </figure>
  );
}

function ArrowButton({
  side,
  label,
  onClick,
  children,
}: {
  side: "left" | "right";
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/40 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/60",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {children}
    </button>
  );
}
