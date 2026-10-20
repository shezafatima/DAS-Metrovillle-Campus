import { z } from "zod";

/**
 * Shapes of the About page content (017). The values match the 005 Settings
 * engine's forms so 014 can store them unchanged — see
 * specs/017-about/contracts/about-content.md.
 */

const text = (max: number) => z.string().trim().min(1).max(max);
const longText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((s) => s === s.trim() && !/\n{3,}/.test(s), "paragraphs separated by one blank line");
const imageRef = z.object({
  url: z.string().url().or(z.string().startsWith("/")),
  publicId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
const image = imageRef.nullable();
const itemId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
const uniqueIds = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id)).size === items.length;

export const ICON_KEYS = [
  "compass",
  "shield-check",
  "target",
  "award",
  "heart-handshake",
  "landmark",
  "users",
  "book-open",
  "star",
  "sprout",
] as const;
export type IconKey = (typeof ICON_KEYS)[number];

export const ourStorySchema = z.object({
  heading: text(80),
  subheading: text(160),
  body: longText(4000),
  image,
  urdu: z
    .object({ lang: z.literal("ur"), heading: text(80), subheading: text(160), body: longText(4000) })
    .optional(),
});

export const visionMissionSchema = z.object({
  heading: text(80),
  subheading: text(160),
  vision: z.object({ heading: text(40), tagline: text(160).optional(), body: longText(1500) }),
  mission: z.object({ heading: text(40), body: longText(1500) }),
  urdu: z
    .object({
      lang: z.literal("ur"),
      vision: z.object({
        heading: text(40),
        tagline: z.object({ lang: z.enum(["ur", "ar"]), text: text(160) }).optional(),
        body: longText(1500),
      }),
      mission: z.object({ heading: text(40), body: longText(1500) }),
    })
    .optional(),
});

export const coreValueSchema = z.object({
  id: itemId,
  name: text(60),
  description: text(240).optional(),
  icon: z.enum(ICON_KEYS),
});
export const coreValuesSchema = z.object({
  heading: text(80),
  subheading: text(160),
  intro: longText(1000),
  values: z.array(coreValueSchema).min(1).max(12).refine(uniqueIds),
  urdu: z
    .object({
      lang: z.literal("ur"),
      heading: text(80),
      subheading: text(160),
      intro: longText(1000),
      values: z.array(z.object({ id: itemId, name: text(60), description: text(240).optional() })),
    })
    .optional(),
});

export const teamMemberSchema = z.object({
  id: itemId,
  name: text(80),
  designation: text(80),
  description: text(300),
  photo: image,
});
export const managementTeamSchema = z.object({
  heading: text(80),
  subheading: text(160).optional(),
  members: z.array(teamMemberSchema).max(24).refine(uniqueIds),
});

export const messageSchema = z.object({
  id: itemId,
  name: text(80),
  designation: text(120),
  body: longText(4000),
  photo: image,
});
export const messagesSchema = z.object({
  heading: text(80),
  subheading: text(160).optional(),
  messages: z.array(messageSchema).max(12).refine(uniqueIds),
});

export const aboutPageSchema = z.object({ title: text(60) });

export type AboutPage = z.infer<typeof aboutPageSchema>;
export type OurStory = z.infer<typeof ourStorySchema>;
export type VisionMission = z.infer<typeof visionMissionSchema>;
export type CoreValues = z.infer<typeof coreValuesSchema>;
export type CoreValue = z.infer<typeof coreValueSchema>;
export type ManagementTeam = z.infer<typeof managementTeamSchema>;
export type TeamMember = z.infer<typeof teamMemberSchema>;
export type Messages = z.infer<typeof messagesSchema>;
export type Message = z.infer<typeof messageSchema>;
