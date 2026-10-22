import type { Metadata } from "next";
import { AcademicOverviewSection } from "@/components/academics/academic-overview";
import { HifzEQuranSection } from "@/components/academics/hifz-e-quran";
import { TrainingPhotos } from "@/components/academics/training-photos";
import { ExaminationSection } from "@/components/academics/examination-section";
import { SyllabiSection } from "@/components/academics/syllabi-section";
import { TeachersTrainingSection } from "@/components/academics/teachers-training";
import { VideoEmbed } from "@/components/media/video-embed";
import { PageBanner } from "@/components/site-shell/page-banner";
import { academicOverview } from "@/content/academics";
import { examinationCopy, syllabiCopy } from "@/content/academics/dynamic-sections";
import { careersCopy } from "@/content/careers";
import { resolveAcademicsView } from "@/lib/academics/resolve";
import { trainingPhotoTiles } from "@/lib/academics/view";
import type { AboutBackground } from "@/lib/about/view";
import { visibleSections } from "@/lib/page-sections/dynamic";
import { resolveDynamicSections } from "@/lib/page-sections/dynamic-server";
import { getPublicSettings } from "@/lib/settings/public";

/** The fixed sections' bands. An admin-managed section takes the other band from the section above it, so two bands of one colour do not touch. */
const FIXED_BACKGROUND: Record<string, AboutBackground> = { "academic-overview": "surface", "teachers-training": "muted", "hifz-e-quran": "surface" };

export const metadata: Metadata = {
  title: "Academics",
  description: academicOverview.body.split("\n\n")[0],
  alternates: { canonical: "/academics" },
};

export default async function AcademicsPage() {
  const [view, presence, syllabi, examination] = await Promise.all([
    resolveAcademicsView(),
    resolveDynamicSections(),
    getPublicSettings("syllabi"),
    getPublicSettings("examination"),
  ]);
  const { trainingVideo, hifzVideo } = view;
  const sections = visibleSections("academics", presence);
  const bands = sections.reduce<AboutBackground[]>((acc, section) => {
    const above = acc.at(-1) ?? "surface";
    acc.push(FIXED_BACKGROUND[section.id] ?? (above === "surface" ? "muted" : "surface"));
    return acc;
  }, []);
  const { layout, tiles } = trainingPhotoTiles(view.training.photos, view.showPlaceholders);
  const poster = (entry: { poster: { url: string } | null }) => (entry.poster ? { src: entry.poster.url } : null);
  return (
    <>
      <PageBanner title={view.page.title} trail={["Academics"]} breadcrumbHome={careersCopy.banner.breadcrumbHome} />
      {sections.map((section, index) => {
        const band = bands[index];
        switch (section.id) {
          case "academic-overview":
            return <AcademicOverviewSection key={section.id} value={view.overview} />;
          case "syllabi":
            return <SyllabiSection key={section.id} heading={section.label} levels={syllabi.levels} copy={syllabiCopy} background={band} />;
          case "examination":
            return <ExaminationSection key={section.id} heading={section.label} blocks={examination.blocks} copy={examinationCopy} background={band} />;
          case "teachers-training":
            return (
              <TeachersTrainingSection
                key={section.id}
                value={view.training}
                photos={layout === "none" ? undefined : <TrainingPhotos layout={layout} tiles={tiles} />}
                video={
                  trainingVideo && (
                    <VideoEmbed
                      video={trainingVideo}
                      title={view.training.video.title}
                      playLabel={`${view.page.playLabel}: ${view.training.video.title}`}
                      poster={poster(view.training.video)}
                    />
                  )
                }
              />
            );
          case "hifz-e-quran":
            return (
              <HifzEQuranSection
                key={section.id}
                value={view.hifz}
                video={
                  hifzVideo && (
                    <VideoEmbed
                      video={hifzVideo}
                      title={view.hifz.video.title}
                      playLabel={`${view.page.playLabel}: ${view.hifz.video.title}`}
                      poster={poster(view.hifz.video)}
                    />
                  )
                }
              />
            );
          default:
            return null;
        }
      })}
    </>
  );
}
