import Image from "next/image";
import { AboutSection } from "./about-section";
import { Paragraphs } from "./paragraphs";
import type { OurStory } from "@/lib/about/schema";
import type { AboutBackground } from "@/lib/about/view";

export function OurStorySection({ value, background }: { value: OurStory; background: AboutBackground }) {
  const panelClass = background === "muted" ? "bg-surface" : "bg-(--color-home-muted-band)";
  return (
    <AboutSection id="our-story" background={background} heading={value.heading} line={value.subheading}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="flex max-w-prose flex-col gap-4 lg:col-span-7">
          <Paragraphs text={value.body} />
        </div>
        <div className="lg:col-span-5">
          <div className={`relative aspect-about-story w-full overflow-hidden rounded-xl ${value.image ? "" : `flex items-center justify-center ${panelClass}`}`}>
            {value.image ? (
              <Image
                src={value.image.url}
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="rounded-xl object-cover"
              />
            ) : (
              <Image src="/images/logo-emblem.svg" alt="" width={160} height={160} className="h-1/2 w-auto" />
            )}
          </div>
        </div>
      </div>
    </AboutSection>
  );
}
