import Image from "next/image";
import { AboutSection } from "@/components/about/about-section";
import { Paragraphs } from "@/components/about/paragraphs";
import type { mobileAppsCopy } from "@/content/resources/mobile-apps";
import type { MobileApps } from "@/lib/resources/schema";
import { AppCard } from "./app-card";

/** Mobile Apps (`#mobile-apps`): the reference text beside the flyer, then one card per app. */
export function MobileAppsSection({ value, copy }: { value: MobileApps; copy: typeof mobileAppsCopy }) {
  const { image } = value;
  return (
    <AboutSection
      id="mobile-apps"
      background="muted"
      heading={value.heading}
      stroke
      beside={
        image && (
          // The frame's box comes from the image's own ratio, so it keeps its size if the image fails to load.
          <figure
            className="mx-auto w-full bg-surface"
            style={{
              maxWidth: `calc(var(--size-resources-flyer-max-h) * ${image.width} / ${image.height})`,
              aspectRatio: `${image.width} / ${image.height}`,
            }}
          >
            <Image
              src={image.url}
              alt={value.imageAlt}
              width={image.width}
              height={image.height}
              sizes="(min-width: 768px) 30vw, 90vw"
              loading="lazy"
              className="block h-full w-full object-contain"
            />
          </figure>
        )
      }
      below={
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {value.apps.map((app) => (
            <AppCard key={app.id} app={app} copy={copy} />
          ))}
        </ul>
      }
    >
      <div className="flex flex-col gap-4">
        <Paragraphs text={value.body} />
      </div>
    </AboutSection>
  );
}
