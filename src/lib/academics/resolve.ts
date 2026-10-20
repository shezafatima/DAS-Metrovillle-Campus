import "server-only";
import { cookies } from "next/headers";
import { academicOverview, academicsPage, hifzEQuran, teachersTraining } from "@/content/academics";
import { academicsMediaFixtures } from "@/content/academics/fixtures";
import { placeholdersAllowed } from "@/lib/content-mode";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { resolveVideo } from "@/lib/video/embed";

/**
 * The Academics content for this request. `cookies()` is read only under the
 * test-only guard (here and in `placeholdersAllowed`), so production pages stay
 * static. The cookie `e2e-academics-media=one|two|three` swaps in sample photos
 * and video addresses so the E2E specs can see them (research R10).
 */
export async function resolveAcademicsView() {
  let training = teachersTraining;
  let hifz = hifzEQuran;
  if (freshReadsForTests()) {
    const mode = (await cookies()).get("e2e-academics-media")?.value;
    if (mode === "one" || mode === "two" || mode === "three") {
      training = {
        ...training,
        photos: academicsMediaFixtures[mode].photos,
        video: { ...training.video, provider: "youtube", url: academicsMediaFixtures.videos.training },
      };
      hifz = { ...hifz, video: { ...hifz.video, provider: "instagram", url: academicsMediaFixtures.videos.hifz } };
    }
  }
  return {
    page: academicsPage,
    overview: academicOverview,
    training,
    hifz,
    trainingVideo: resolveVideo(training.video),
    hifzVideo: resolveVideo(hifz.video),
    showPlaceholders: await placeholdersAllowed(),
  };
}
