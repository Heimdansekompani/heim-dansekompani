import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeSections, type ProjectSectionData } from "@/lib/project";
import { isValidHexColor } from "@/lib/rich-text-constants";
import { AdminEditLink } from "@/components/admin-edit-link";
import { SectionList } from "@/components/section-list";

export const metadata: Metadata = {
  title: "Om | Heim Dansekompani",
};

interface OmContent {
  sections: ProjectSectionData[];
  pageBackground: string | null;
}

// Content is managed through the admin CMS, so it can't be cached forever —
// but it also doesn't need a fresh Firestore round-trip on every visit. The
// admin editor calls /api/revalidate right after a save (see
// app/admin/om/page.tsx), which invalidates this immediately; the 5-minute
// window below is just a fallback in case that call is ever missed. No
// ProjectSectionData field is a Firestore Timestamp, so this is safe to
// cache as-is — contrast with app/prosjekter, which has to convert
// Timestamps around the cache boundary (see lib/firestore-cache.ts).
const getOmContent = unstable_cache(
  async (): Promise<OmContent> => {
    const snapshot = await getDoc(doc(db, "settings", "om"));
    const data = snapshot.data();
    return {
      sections: normalizeSections(data?.sections),
      pageBackground: isValidHexColor(data?.pageBackground)
        ? data.pageBackground
        : null,
    };
  },
  ["om-content"],
  { tags: ["om-content"], revalidate: 300 },
);

export default async function OmPage() {
  const { sections, pageBackground } = await getOmContent();

  return (
    // -mt-20/pt-20 pulls the page background up under the fixed h-20 navbar
    // so its bg-black/80 backdrop-blur tints the page color instead of
    // sitting on a black strip.
    <div
      style={
        pageBackground ? { backgroundColor: pageBackground } : undefined
      }
      className="-mt-20 pt-20"
    >
      <div className="py-20 sm:py-28">
        <div className="mx-auto flex max-w-6xl items-start justify-between gap-4 px-6">
          <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
            Om oss
          </h1>
          <AdminEditLink href="/admin/om" label="Rediger side" />
        </div>
        <div className="mt-12">
          {sections.length === 0 ? (
            <p className="mx-auto max-w-6xl px-6 font-serif text-base leading-relaxed text-white/80 sm:text-lg">
              Innhold for denne siden publiseres her fortløpende.
            </p>
          ) : (
            <SectionList
              sections={sections}
              className="font-serif text-base leading-relaxed text-white/80 @2xl:text-lg"
              animate
            />
          )}
        </div>
      </div>
    </div>
  );
}
