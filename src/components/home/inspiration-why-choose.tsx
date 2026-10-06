import Image from "next/image";
import { homeContent } from "@/content/home";
import type { PublicVideo } from "@/lib/settings/public";
import { SectionHeading } from "./section-heading";
import { YouTubeEmbed } from "./youtube-embed";

/**
 * The reference's row 2 (006 FR-009, FR-010): the "Inspired By Excellence &
 * Innovation" block with the school logo, then "Why Choose Dar-e-Arqam
 * Schools?" — its text beside the Settings home video at ≥1024px, stacked
 * below. With no video address, the text spans the row and no empty frame
 * is drawn.
 */
export function InspirationWhyChoose({ video }: { video: PublicVideo }) {
  const { inspiration, whyChoose } = homeContent;
  return (
    <section aria-labelledby="inspiration-heading" className="mx-auto flex w-full max-w-(--container-max-width) flex-col gap-10 px-(--container-gutter-x) py-(--spacing-home-band-y)">
      <div className="flex flex-col items-center gap-4">
        <Image src={inspiration.logo.src} alt={inspiration.logo.alt} width={inspiration.logo.width} height={inspiration.logo.height} className="size-(--spacing-home-inspiration-logo)" />
        <SectionHeading id="inspiration-heading" heading={inspiration.heading} line={inspiration.line} />
      </div>
      <div className={video.youtubeId ? "grid items-center gap-8 lg:grid-cols-2" : "flex flex-col"} data-testid="why-choose">
        <div className="flex flex-col gap-4">
          <h2 className="font-bold font-heading text-(--color-home-dark-text) text-h3 uppercase leading-(--text-h3--line-height)">{whyChoose.heading}</h2>
          {whyChoose.paragraphs.map((paragraph) => (
            <p key={paragraph.slice(0, 24)} className="font-body text-body text-text">
              {paragraph}
            </p>
          ))}
        </div>
        {video.youtubeId && <YouTubeEmbed id={video.youtubeId} title={whyChoose.video.title} playLabel={whyChoose.video.play} />}
      </div>
    </section>
  );
}
