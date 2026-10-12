import type { TrainingPhoto } from "@/lib/academics/schema";

/**
 * TEST ONLY. Sample photos and video addresses that the E2E specs switch on
 * with the `e2e-academics-media` cookie (research R10). Never imported outside
 * src/lib/academics/resolve.ts, and only read when freshReadsForTests() is
 * true, so production never sees them.
 */
const photo = (n: number, file: string): TrainingPhoto => ({
  id: `fixture-${n}`,
  image: { url: `/images/${file}.svg`, publicId: "", width: 100, height: 100 },
  alt: `Sample training photo ${n}`,
});
const ALL = [photo(1, "teachers-training"), photo(2, "co-curricular"), photo(3, "personality_development-1")];

export const academicsMediaFixtures = {
  one: { photos: ALL.slice(0, 1) },
  two: { photos: ALL.slice(0, 2) },
  three: { photos: ALL.slice(0, 3) },
  videos: {
    training: "https://www.youtube.com/watch?v=Fixture0001",
    hifz: "https://www.instagram.com/reel/Fixture12345/",
  },
};
