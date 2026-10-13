import { z } from "zod";
import { imageRef, itemId, longText, text, uniqueIds } from "@/lib/content/fields";

export const LINK_TYPES = ["play-store", "app-store", "direct-download"] as const;
export const APP_ICON_KEYS = ["book-a", "calculator", "feather", "monitor-smartphone", "graduation-cap", "smartphone"] as const;

export type LinkType = (typeof LINK_TYPES)[number];
export type AppIconKey = (typeof APP_ICON_KEYS)[number];

/** True when `url` is an https link of the kind `linkType` names (R2). Reused by 014 as the validator. */
export function linkMatchesType(url: string, linkType: LinkType): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  switch (linkType) {
    case "play-store":
      return (
        parsed.hostname === "play.google.com" &&
        parsed.pathname === "/store/apps/details" &&
        (parsed.searchParams.get("id") ?? "") !== ""
      );
    case "app-store":
      return parsed.hostname === "apps.apple.com";
    case "direct-download":
      return true;
  }
}

export const appSchema = z
  .object({
    id: itemId,
    name: text(60),
    label: text(120).optional(),
    icon: z.enum(APP_ICON_KEYS),
    url: z.string().trim().max(500), // "" = no working link: the card shows the unavailable note
    linkType: z.enum(LINK_TYPES),
  })
  .refine((a) => a.url === "" || linkMatchesType(a.url, a.linkType), "URL does not match its link type, or is not https");

export const mobileAppsSchema = z
  .object({
    heading: text(120),
    body: longText(2000),
    image: imageRef.nullable(),
    imageAlt: z.string().trim().max(600),
    apps: z.array(appSchema).min(1).max(8).refine(uniqueIds),
  })
  .refine((v) => v.image === null || v.imageAlt.length > 0, "imageAlt is required with an image");

export type MobileApps = z.infer<typeof mobileAppsSchema>;
export type MobileApp = z.infer<typeof appSchema>;
