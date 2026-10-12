import Image from "next/image";
import { AboutSection } from "@/components/about/about-section";
import { Paragraphs } from "@/components/about/paragraphs";
import type { AcademicOverview } from "@/lib/academics/schema";

/** Academic Overview: the text beside an image (or the emblem panel until a photo is supplied). */
export function AcademicOverviewSection({ value }: { value: AcademicOverview }) {
  return (
    <AboutSection headingBand boldLine id="academic-overview" background="surface" heading={value.heading} line={value.subheading}>
      <div className="grid gap-8 md:grid-cols-12 md:items-center md:gap-12">
        <div className="flex max-w-prose flex-col gap-4 md:col-span-7">
          <Paragraphs text={value.body} />
        </div>
        <figure className="md:col-span-5">
          <div
            className={`relative aspect-academics-overview w-full overflow-hidden rounded-xl bg-(--color-home-muted-band) ${value.image ? "" : "flex items-center justify-center"}`}
          >
            {value.image ? (
              <Image
                src={value.image.url}
                alt={value.imageAlt}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="rounded-xl object-cover"
              />
            ) : (
              <Image src="/images/logo-emblem.svg" alt="" width={160} height={160} className="h-1/2 w-auto" />
            )}
          </div>
        </figure>
      </div>
    </AboutSection>
  );
}
