import { describe, expect, it } from "vitest";
import {
  academicOverviewSchema,
  academicsPageSchema,
  hifzEQuranSchema,
  teachersTrainingSchema,
  videoEntrySchema,
} from "./schema";

const img = { url: "/images/x.svg", publicId: "", width: 4, height: 3 };
const video = { provider: "youtube" as const, url: "", poster: null, title: "A video" };
const item = (n: number) => ({ id: `item-${n}`, text: `Item ${n}`, icon: "compass" as const });
const photo = (n: number) => ({ id: `photo-${n}`, image: img, alt: `Photo ${n}` });
const training = (over: object = {}) => ({ heading: "H", intro: "Intro", items: [item(1)], photos: [], video, ...over });
const sub = (n: number) => ({ id: `sub-${n}`, heading: `Sub ${n}`, points: [{ id: "p-1", text: "Point", icon: "search" as const }] });
const hifz = (over: object = {}) => ({ heading: "H", subheading: "S", intro: "Intro", subsections: [sub(1)], video, ...over });

describe("videoEntrySchema", () => {
  it("accepts an empty URL and a valid URL for its provider", () => {
    expect(videoEntrySchema.safeParse(video).success).toBe(true);
    expect(videoEntrySchema.safeParse({ ...video, url: "https://youtu.be/dQw4w9WgXcQ" }).success).toBe(true);
    expect(
      videoEntrySchema.safeParse({ ...video, provider: "instagram", url: "https://www.instagram.com/reel/ABC123xyz/" }).success,
    ).toBe(true);
  });
  it("rejects a URL of the wrong provider, too long, or an empty title", () => {
    expect(videoEntrySchema.safeParse({ ...video, url: "https://www.instagram.com/p/ABC123xyz/" }).success).toBe(false);
    expect(videoEntrySchema.safeParse({ ...video, url: `https://youtu.be/${"a".repeat(300)}` }).success).toBe(false);
    expect(videoEntrySchema.safeParse({ ...video, title: "" }).success).toBe(false);
  });
});

describe("academicOverviewSchema", () => {
  const base = { heading: "H", subheading: "S", body: "B", image: null, imageAlt: "" };
  it("accepts no image with empty alt", () => {
    expect(academicOverviewSchema.safeParse(base).success).toBe(true);
  });
  it("rejects an image with empty alt", () => {
    expect(academicOverviewSchema.safeParse({ ...base, image: img }).success).toBe(false);
    expect(academicOverviewSchema.safeParse({ ...base, image: img, imageAlt: "A classroom" }).success).toBe(true);
  });
});

describe("teachersTrainingSchema", () => {
  it("accepts 0 photos", () => {
    expect(teachersTrainingSchema.safeParse(training()).success).toBe(true);
  });
  it("rejects 0 and 41 items and duplicate item ids", () => {
    expect(teachersTrainingSchema.safeParse(training({ items: [] })).success).toBe(false);
    expect(teachersTrainingSchema.safeParse(training({ items: Array.from({ length: 41 }, (_, i) => item(i)) })).success).toBe(false);
    expect(teachersTrainingSchema.safeParse(training({ items: [item(1), item(1)] })).success).toBe(false);
  });
  it("rejects an unknown icon key", () => {
    expect(teachersTrainingSchema.safeParse(training({ items: [{ ...item(1), icon: "rocket" }] })).success).toBe(false);
  });
  it("rejects 4 photos, an empty alt and duplicate photo ids", () => {
    expect(teachersTrainingSchema.safeParse(training({ photos: [1, 2, 3, 4].map(photo) })).success).toBe(false);
    expect(teachersTrainingSchema.safeParse(training({ photos: [{ ...photo(1), alt: "" }] })).success).toBe(false);
    expect(teachersTrainingSchema.safeParse(training({ photos: [photo(1), photo(1)] })).success).toBe(false);
  });
});

describe("hifzEQuranSchema", () => {
  it("rejects 0 and 7 subsections and duplicate ids", () => {
    expect(hifzEQuranSchema.safeParse(hifz({ subsections: [] })).success).toBe(false);
    expect(hifzEQuranSchema.safeParse(hifz({ subsections: [1, 2, 3, 4, 5, 6, 7].map(sub) })).success).toBe(false);
    expect(hifzEQuranSchema.safeParse(hifz({ subsections: [sub(1), sub(1)] })).success).toBe(false);
    expect(hifzEQuranSchema.safeParse(hifz()).success).toBe(true);
  });
});

describe("hifz points", () => {
  it("rejects a sub-section with no points or duplicate point ids", () => {
    expect(hifzEQuranSchema.safeParse(hifz({ subsections: [{ ...sub(1), points: [] }] })).success).toBe(false);
    const p = sub(1).points[0];
    expect(hifzEQuranSchema.safeParse(hifz({ subsections: [{ ...sub(1), points: [p, p] }] })).success).toBe(false);
  });
});

describe("academicsPageSchema", () => {
  it("rejects an empty title or playLabel", () => {
    expect(academicsPageSchema.safeParse({ title: "", playLabel: "Play" }).success).toBe(false);
    expect(academicsPageSchema.safeParse({ title: "Academics", playLabel: "" }).success).toBe(false);
    expect(academicsPageSchema.safeParse({ title: "Academics", playLabel: "Play video" }).success).toBe(true);
  });
});
