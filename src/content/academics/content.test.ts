import { describe, expect, it } from "vitest";
import {
  academicOverview,
  academicsPage,
  academicsReviews,
  hifzEQuran,
  teachersTraining,
  teachersTrainingSource,
} from "./index";
import {
  academicOverviewSchema,
  academicsPageSchema,
  hifzEQuranSchema,
  teachersTrainingSchema,
} from "@/lib/academics/schema";

const TRAINING_IDS = [
  "school-leadership",
  "managing-classrooms",
  "improving-student-grades",
  "assessment-manuals",
  "literacy-development",
  "learning-through-technology",
  "professional-development-guides",
  "curriculum-planning-guides",
];

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

function imageUrls(): string[] {
  return [
    academicOverview.image?.url,
    ...teachersTraining.photos.map((p) => p.image.url),
    teachersTraining.video.poster?.url,
    hifzEQuran.video.poster?.url,
  ].filter((u): u is string => typeof u === "string");
}

describe("Academics content", () => {
  it("parses with its schemas", () => {
    expect(() => {
      academicsPageSchema.parse(academicsPage);
      academicOverviewSchema.parse(academicOverview);
      teachersTrainingSchema.parse(teachersTraining);
      hifzEQuranSchema.parse(hifzEQuran);
    }).not.toThrow();
  });

  it("Teachers' Training has the 8 chosen points, each with an icon, in order", () => {
    expect(teachersTraining.items.map((i) => i.id)).toEqual(TRAINING_IDS);
    expect(teachersTraining.items.every((i) => i.icon)).toBe(true);
  });

  it("Hifz-e-Quran has its two subsections, each with two points and an icon", () => {
    expect(hifzEQuran.subsections.map((s) => s.id)).toEqual(["admission-based-on-aptitude", "hifz-alongside-academic-education"]);
    for (const sub of hifzEQuran.subsections) {
      expect(sub.points).toHaveLength(2);
      expect(sub.points.every((p) => p.icon)).toBe(true);
    }
  });

  it("keeps the Hifz heading exactly as written (T4)", () => {
    expect(hifzEQuran.heading).toBe("HIFZ-UL-QURAN PROGRAM");
  });

  it("is pending client approval and records the Teachers' Training source", () => {
    for (const review of Object.values(academicsReviews)) expect(review.status).toBe("pending-client-approval");
    expect(teachersTrainingSource).toEqual({ url: "https://das.edu.pk/academics/teachers-training/", copiedOn: "2026-10-12" });
  });

  it("stores no Urdu (FR-008)", () => {
    const all = strings([academicsPage, academicOverview, teachersTraining, hifzEQuran]);
    for (const s of all) expect(ARABIC_SCRIPT.test(s), s).toBe(false);
  });

  it("references only local or Cloudinary images (R11)", () => {
    for (const url of imageUrls()) expect(url.startsWith("/") || url.startsWith("https://res.cloudinary.com/"), url).toBe(true);
  });
});
