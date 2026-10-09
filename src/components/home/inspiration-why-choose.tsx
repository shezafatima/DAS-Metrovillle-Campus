import { homeContent } from "@/content/home";
import type { PublicVideo } from "@/lib/settings/public";
import { SectionHeading } from "./section-heading";
import { YouTubeEmbed } from "./youtube-embed";

/**
 * The reference's row 2 (006 FR-009, FR-010): the "Inspired By Excellence &
 * Innovation" block (heading and line, no logo), then "Why Metroville
 * Campus?" — its text beside the Settings home video at ≥1024px, stacked
 * below. With no video address, the text spans the row and no empty frame
 * is drawn.
 */
export function InspirationWhyChoose({ video }: { video: PublicVideo }) {
  const { inspiration, whyChoose } = homeContent;
  return (
    <section aria-labelledby="inspiration-heading" className="w-full">
      {/* The heading and its supporting line sit in a full-width navy band that starts right under the cards section (white text). */}
      <div className="bg-primary px-(--container-gutter-x) py-8 md:py-10" data-testid="inspiration-band">
        <div className="mx-auto max-w-(--container-max-width)">
          <SectionHeading id="inspiration-heading" heading={inspiration.heading} line={inspiration.line} tone="light" divider={false} />
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-(--container-max-width) flex-col gap-10 px-(--container-gutter-x) pt-10 pb-(--spacing-home-band-y)">
      <div className={video.youtubeId ? "grid items-center gap-8 lg:grid-cols-2" : "flex flex-col"} data-testid="why-choose">
        <div className="flex flex-col gap-4">
          <h2 className="font-bold font-heading text-(--color-home-dark-text) text-h3 uppercase leading-(--text-h3--line-height)">{whyChoose.heading}</h2>
          <h3 className="font-bold font-heading text-(--color-home-dark-text) text-lg">{whyChoose.subheading}</h3>
          <p className="font-body text-body text-text">{whyChoose.intro}</p>
          <h3 className="font-bold font-heading text-(--color-home-dark-text) text-lg">{whyChoose.pointsHeading}</h3>
          <ul className="flex list-disc flex-col gap-2 ps-6 font-body text-body text-text marker:text-primary">
            {whyChoose.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="font-body text-body text-text">{whyChoose.closing}</p>
        </div>
        {video.youtubeId && <YouTubeEmbed id={video.youtubeId} title={whyChoose.video.title} playLabel={whyChoose.video.play} />}
      </div>
      </div>
    </section>
  );
}
