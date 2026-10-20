import type { Metadata } from "next";
import { AcademicOverviewSection } from "@/components/academics/academic-overview";
import { HifzEQuranSection } from "@/components/academics/hifz-e-quran";
import { TrainingPhotos } from "@/components/academics/training-photos";
import { TeachersTrainingSection } from "@/components/academics/teachers-training";
import { VideoEmbed } from "@/components/media/video-embed";
import { PageBanner } from "@/components/site-shell/page-banner";
import { academicOverview } from "@/content/academics";
import { careersCopy } from "@/content/careers";
import { pageSections } from "@/content/site-shell";
import { resolveAcademicsView } from "@/lib/academics/resolve";
import { trainingPhotoTiles } from "@/lib/academics/view";

export const metadata: Metadata = {
  title: "Academics",
  description: academicOverview.body.split("\n\n")[0],
  alternates: { canonical: "/academics" },
};

export default async function AcademicsPage() {
  const view = await resolveAcademicsView();
  const { trainingVideo, hifzVideo } = view;
  const { layout, tiles } = trainingPhotoTiles(view.training.photos, view.showPlaceholders);
  const poster = (entry: { poster: { url: string } | null }) => (entry.poster ? { src: entry.poster.url } : null);
  return (
    <>
      <PageBanner title={view.page.title} trail={["Academics"]} breadcrumbHome={careersCopy.banner.breadcrumbHome} />
      {pageSections.academics.map((section) => {
        switch (section.id) {
          case "academic-overview":
            return <AcademicOverviewSection key={section.id} value={view.overview} />;
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
