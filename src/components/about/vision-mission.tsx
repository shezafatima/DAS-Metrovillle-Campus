import { Eye, Flag } from "lucide-react";
import { AboutSection } from "./about-section";
import { Paragraphs } from "./paragraphs";
import type { VisionMission } from "@/lib/about/schema";

/** Always the navy band: two panels with a yellow accent disc and top rule, white text. */
export function VisionMissionSection({ value }: { value: VisionMission }) {
  const panels = [
    { key: "vision", Icon: Eye, heading: value.vision.heading, tagline: value.vision.tagline, body: value.vision.body },
    { key: "mission", Icon: Flag, heading: value.mission.heading, tagline: undefined, body: value.mission.body },
  ];
  return (
    <AboutSection id="vision-mission" background="navy" heading={value.heading} line={value.subheading}>
      <div className="grid gap-6 md:grid-cols-2">
        {panels.map(({ key, Icon, heading, tagline, body }) => (
          <article key={key} className="flex flex-col gap-4 rounded-xl border-t-4 border-t-topbar bg-about-panel p-6 md:p-8">
            <span aria-hidden="true" className="flex size-12 items-center justify-center rounded-full bg-topbar">
              <Icon aria-hidden="true" focusable="false" className="size-6 text-primary" />
            </span>
            <h3 className="font-bold font-heading text-h3 text-white">{heading}</h3>
            {tagline && <p className="font-heading font-medium text-white italic">{tagline}</p>}
            <Paragraphs text={body} className="text-white" />
          </article>
        ))}
      </div>
    </AboutSection>
  );
}
