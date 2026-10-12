import type { ReactNode } from "react";
import { AboutSection } from "@/components/about/about-section";
import { Paragraphs } from "@/components/about/paragraphs";
import { IconPoints } from "./icon-points";
import type { TeachersTraining } from "@/lib/academics/schema";

/**
 * Teachers' Training: a bold intro line and the points, each with an icon, with
 * the video beside them from `md`, then the
 * photos in an even row below. Both are optional slots; without a video the text
 * spans the row.
 */
export function TeachersTrainingSection({
  value,
  photos,
  video,
}: {
  value: TeachersTraining;
  photos?: ReactNode;
  video?: ReactNode;
}) {
  const text = (
    <div className="flex max-w-prose flex-col gap-5">
      <Paragraphs text={value.intro} className="font-bold font-heading text-2xl text-primary md:text-3xl" />
      <IconPoints items={value.items} columns={2} />
    </div>
  );
  return (
    <AboutSection stroke compact id="teachers-training" background="muted" heading={value.heading}>
      {video ? (
        <div className="grid gap-6 md:grid-cols-12 md:items-center md:gap-10">
          <div className="md:col-span-7">{text}</div>
          <div className="md:col-span-5" data-testid="training-video">
            {video}
          </div>
        </div>
      ) : (
        text
      )}
      {photos}
    </AboutSection>
  );
}
