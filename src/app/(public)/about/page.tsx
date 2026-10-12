import type { Metadata } from "next";
import { CoreValuesSection } from "@/components/about/core-values";
import { ManagementTeamSection } from "@/components/about/management-team";
import { MessagesSection } from "@/components/about/messages";
import { OurStorySection } from "@/components/about/our-story";
import { VisionMissionSection } from "@/components/about/vision-mission";
import { PageBanner } from "@/components/site-shell/page-banner";
import {
  aboutPage,
  coreValues,
  managementTeam,
  messagesContent,
  ourStory,
  visionMission,
} from "@/content/about";
import { careersCopy } from "@/content/careers";
import { resolveAboutView } from "@/lib/about/resolve-view";

export const metadata: Metadata = {
  title: "About Us",
  description: ourStory.body.split("\n\n")[0],
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const view = await resolveAboutView();
  return (
    <>
      <PageBanner title={aboutPage.title} trail={["About"]} breadcrumbHome={careersCopy.banner.breadcrumbHome} />
      {view.sections.map((section) => {
        switch (section.id) {
          case "our-story":
            return <OurStorySection key={section.id} value={ourStory} background={section.background} />;
          case "vision-mission":
            return <VisionMissionSection key={section.id} value={visionMission} />;
          case "core-values":
            return <CoreValuesSection key={section.id} value={coreValues} background={section.background} />;
          case "management-team":
            return (
              <ManagementTeamSection
                key={section.id}
                heading={managementTeam.heading}
                subheading={managementTeam.subheading}
                cards={view.teamCards}
                background={section.background}
              />
            );
          case "messages":
            return <MessagesSection key={section.id} value={messagesContent} background={section.background} />;
          default:
            return null;
        }
      })}
    </>
  );
}
