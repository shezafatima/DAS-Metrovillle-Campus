import Image from "next/image";
import { AboutSection } from "./about-section";
import { HeartHandshake, Landmark, Sprout, type LucideIcon } from "lucide-react";
import type { OurStory } from "@/lib/about/schema";
import type { AboutBackground } from "@/lib/about/view";

/** One decorative icon per paragraph: the founding, the Dar-e-Arqam network, the aim for each child. Extra paragraphs get none. */
const paragraphIcons: LucideIcon[] = [Landmark, HeartHandshake, Sprout];

export function OurStorySection({ value, background }: { value: OurStory; background: AboutBackground }) {
  const panelClass = background === "muted" ? "bg-surface" : "bg-(--color-home-muted-band)";
  return (
    <AboutSection id="our-story" background={background} heading={value.heading} line={value.subheading}>
      <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
        <div className="flex max-w-prose flex-col gap-4 lg:col-span-7">
          {value.body.split("\n\n").map((paragraph, index) => {
            const Icon = paragraphIcons[index] as LucideIcon | undefined;
            return (
              <div key={index} className="flex items-start gap-4">
                {Icon && <Icon aria-hidden="true" focusable="false" className="mt-1 size-6 shrink-0 text-primary" />}
                <p className={`font-body text-body text-text ${Icon ? "" : "md:ml-10"}`}>{paragraph}</p>
              </div>
            );
          })}
        </div>
        <div className="lg:col-span-5">
          <div className={`relative aspect-about-story w-full overflow-hidden rounded-xl ${value.image ? "" : `flex items-center justify-center ${panelClass}`}`}>
            {value.image ? (
              <Image
                src={value.image.url}
                alt={value.imageAlt ?? ""}
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
