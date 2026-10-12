import { z } from "zod";
import { imageRef, itemId, longText, text, uniqueIds } from "@/lib/content/fields";
import { resolveVideo } from "@/lib/video/embed";

/**
 * Shapes of the Academics page content (018). The values match the 005
 * Settings engine's forms so 014 can store them unchanged — see
 * specs/018-academics/contracts/academics-content.md.
 */

export const VIDEO_PROVIDERS = ["youtube", "instagram"] as const;

export const videoEntrySchema = z
  .object({
    provider: z.enum(VIDEO_PROVIDERS),
    /** "" means no video. */
    url: z.string().trim().max(300),
    /** null means the local placeholder poster. */
    poster: imageRef.nullable(),
    title: text(120),
  })
  .refine((v) => v.url === "" || resolveVideo(v) !== null, "URL is not a recognised post/video for its provider");

export const academicsPageSchema = z.object({ title: text(60), playLabel: text(40) });

export const academicOverviewSchema = z
  .object({
    heading: text(80),
    subheading: text(160),
    body: longText(4000),
    image: imageRef.nullable(),
    imageAlt: z.string().trim().max(200),
  })
  .refine((v) => v.image === null || v.imageAlt.length > 0, "imageAlt is required with an image");

/** Icon keys for the Academics point lists (stored as data; the component maps them to icons). */
export const POINT_ICON_KEYS = [
  "compass",
  "users",
  "trending-up",
  "clipboard-check",
  "book-open",
  "laptop",
  "graduation-cap",
  "notebook-pen",
  "search",
] as const;
export type PointIconKey = (typeof POINT_ICON_KEYS)[number];

const trainingItemSchema = z.object({ id: itemId, text: text(160), icon: z.enum(POINT_ICON_KEYS) });
const trainingPhotoSchema = z.object({ id: itemId, image: imageRef, alt: text(200) });

export const teachersTrainingSchema = z.object({
  heading: text(80),
  intro: longText(1500),
  items: z.array(trainingItemSchema).min(1).max(40).refine(uniqueIds),
  photos: z.array(trainingPhotoSchema).max(3).refine(uniqueIds),
  video: videoEntrySchema,
});

const hifzPointSchema = z.object({ id: itemId, text: text(300), icon: z.enum(POINT_ICON_KEYS) });
const hifzSubsectionSchema = z.object({
  id: itemId,
  heading: text(80),
  points: z.array(hifzPointSchema).min(1).max(8).refine(uniqueIds),
});

export const hifzEQuranSchema = z.object({
  heading: text(80),
  subheading: text(160),
  intro: longText(1500),
  subsections: z.array(hifzSubsectionSchema).min(1).max(6).refine(uniqueIds),
  video: videoEntrySchema,
});

export type VideoEntry = z.infer<typeof videoEntrySchema>;
export type AcademicsPage = z.infer<typeof academicsPageSchema>;
export type AcademicOverview = z.infer<typeof academicOverviewSchema>;
export type TeachersTraining = z.infer<typeof teachersTrainingSchema>;
export type TrainingItem = z.infer<typeof trainingItemSchema>;
export type TrainingPhoto = z.infer<typeof trainingPhotoSchema>;
export type HifzEQuran = z.infer<typeof hifzEQuranSchema>;
export type HifzPoint = z.infer<typeof hifzPointSchema>;
export type HifzSubsection = z.infer<typeof hifzSubsectionSchema>;

/** Not part of the 014 value: who still has to approve the content (FR-010). */
export type ReviewMeta = { status: "pending-client-approval" | "approved"; notes: string[] };
