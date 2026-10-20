import {
  academicOverviewSchema,
  academicsPageSchema,
  hifzEQuranSchema,
  teachersTrainingSchema,
} from "@/lib/academics/schema";
import { academicOverview as rawOverview, review as overviewReview } from "./academic-overview";
import { hifzEQuran as rawHifz, review as hifzReview } from "./hifz-e-quran";
import { academicsPage as rawPage, review as pageReview } from "./page";
import { review as trainingReview, teachersTraining as rawTraining } from "./teachers-training";

// Parsed at module load, so a bad edit fails loudly at build and in tests.
export const academicsPage = academicsPageSchema.parse(rawPage);
export const academicOverview = academicOverviewSchema.parse(rawOverview);
export const teachersTraining = teachersTrainingSchema.parse(rawTraining);
export const hifzEQuran = hifzEQuranSchema.parse(rawHifz);

export { teachersTrainingSource } from "./teachers-training";

export const academicsReviews = {
  page: pageReview,
  "academic-overview": overviewReview,
  "teachers-training": trainingReview,
  "hifz-e-quran": hifzReview,
};
