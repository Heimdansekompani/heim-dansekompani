import type { Metadata } from "next";
import { doc, getDoc } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { normalizeSections, type ProjectSectionData } from "@/lib/project";
import { isValidHexColor } from "@/lib/rich-text-constants";
import { isStaffRequest } from "@/lib/server-auth";
import { SectionList } from "@/components/section-list";
import { UnderConstruction } from "@/components/under-construction";

export const metadata: Metadata = {
  title: "Om | Heim Dansekompani",
};

// Content is managed through the admin CMS, so this must never be statically
// cached at build time.
export const dynamic = "force-dynamic";

interface OmContent {
  sections: ProjectSectionData[];
  pageBackground: string | null;
}

async function getOmContent(): Promise<OmContent> {
  const snapshot = await getDoc(doc(db, "settings", "om"));
  const data = snapshot.data();
  return {
    sections: normalizeSections(data?.sections),
    pageBackground: isValidHexColor(data?.pageBackground)
      ? data.pageBackground
      : null,
  };
}

export default async function OmPage() {
  if (!(await isStaffRequest())) return <UnderConstruction />;

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
        <div className="mx-auto max-w-6xl px-6">
          <h1 className="font-serif text-3xl font-semibold tracking-[0.15em] sm:text-4xl">
            Om oss
          </h1>
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
            />
          )}
        </div>
      </div>
    </div>
  );
}
