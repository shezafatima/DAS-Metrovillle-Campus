import { unstable_cache } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import type { ContactInfo, SocialPlatform } from "@/content/site-shell";
import { connectDb } from "@/lib/db";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { logSecurityEvent } from "@/lib/log";
import { Settings } from "@/models/settings";
import { levelSlugs } from "@/lib/syllabi/slug";
import { formatDayMonth, isDayMonth } from "@/lib/text/day-month";
import { toParagraphs } from "@/lib/text/paragraphs";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import { toLiveValue } from "./items";
import { GROUPS } from "./registry";
import type { GroupKey, GroupValue, ImageRef } from "./types";
import { parseYouTubeAddress } from "./youtube";

/**
 * The one way the public site reads Settings (005, research R5,
 * contracts/settings-actions.md "Public read").
 *
 *  - Returns only what the site displays (FR-003): no deleted items, no
 *    hidden slides, no version or author.
 *  - Cached for 60 s and tagged, so a save (which revalidates the tags) shows
 *    up at once and any other change shows within a minute (FR-030).
 *  - Never throws (FR-032): a failed or slow (> 3 s) read falls back to the
 *    last value this process read, else to the starting values. The cached
 *    function itself THROWS on failure, so a failed read is never cached.
 */

export const SETTINGS_TAG = "settings";
export const settingsGroupTag = (group: GroupKey) => `settings:${group}`;
export const SETTINGS_REVALIDATE_SECONDS = 60;
export const SETTINGS_READ_TIMEOUT_MS = 3000;

export interface PublicSlide {
  id: string;
  desktop: ImageRef;
  mobile: ImageRef | null;
  alt: string;
  heading: string;
  button: { label: string; href: string } | null;
}
export interface PublicHero {
  displaySeconds: number;
  slides: PublicSlide[];
}
export interface PublicStats {
  students: number;
  books: number;
  teachers: number;
  campuses: number;
}
export interface PublicVideo {
  youtubeUrl: string;
  /** Derived from the address, never stored; null means "no video". */
  youtubeId: string | null;
}

/** The admission window as saved (020). Whether it is open is decided per request (src/lib/admission/window.ts). */
export interface PublicAdmission {
  /** "YYYY-MM-DD", or "" when not set. */
  opensOn: string;
  closesOn: string;
  /** "" when not set. */
  announcement: string;
  closedMessage: string;
  /**
   * The "Classes open for admission" list (013, 014b), live items only, in saved order. `levelId` is the id of the
   * Class Level that was ticked, or "" for a typed name that is not linked to one yet. Whether the form offers an
   * item is decided by `offeredClasses` (src/lib/registration/offered-classes.ts), never by reading this directly.
   */
  classes: PublicAdmissionClass[];
}
export interface PublicAdmissionClass {
  levelId: string;
  name: string;
}

/** Class Levels as the Admission page and the registration form see them (014b). */
export interface PublicClassLevel {
  id: string;
  name: string;
  ageRule: string;
}
export interface PublicClassLevels {
  /** "MM-DD". */
  ageReferenceDate: string;
  /** The date as the age column header says it: "31 July". */
  ageHeader: string;
  levels: PublicClassLevel[];
}

/** One footer portal link (014b). `insecure` is true for an `http://` address; the site does not show it, the admin panel does. */
export interface PublicPortalLink {
  id: string;
  label: string;
  url: string;
  insecure: boolean;
}
export interface PublicPortalLinks {
  links: PublicPortalLink[];
}

/** One topic group of a syllabus subject (014b): an optional heading, intro paragraphs, and bulleted topics. */
export interface PublicSyllabusGroup {
  id: string;
  heading: string;
  paragraphs: string[];
  topics: string[];
}
export interface PublicSyllabusSubject {
  id: string;
  name: string;
  groups: PublicSyllabusGroup[];
}
export interface PublicSyllabusLevel {
  id: string;
  name: string;
  /** The level's address fragment: `#syllabi-<slug>` (src/lib/syllabi/slug.ts). */
  slug: string;
  subjects: PublicSyllabusSubject[];
}
export interface PublicSyllabus {
  levels: PublicSyllabusLevel[];
}

/** One Examination block (014b): a heading and the paragraphs of its body. */
export interface PublicExaminationBlock {
  id: string;
  heading: string;
  paragraphs: string[];
}
export interface PublicExamination {
  blocks: PublicExaminationBlock[];
}

export interface PublicShapes {
  contact: ContactInfo;
  hero: PublicHero;
  stats: PublicStats;
  video: PublicVideo;
  admission: PublicAdmission;
  portalLinks: PublicPortalLinks;
  classLevels: PublicClassLevels;
  syllabi: PublicSyllabus;
  examination: PublicExamination;
}

// Same order as the content file and as SocialLinks' fixed order.
const SOCIAL: SocialPlatform[] = ["facebook", "youtube", "instagram", "tiktok"];

const str = (value: unknown): string => (typeof value === "string" ? value : "");
const num = (value: unknown): number => (typeof value === "number" ? value : 0);
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? (value.filter((entry) => entry && typeof entry === "object") as Record<string, unknown>[]) : [];

/** Maps a LIVE group value (list items already without deleted ones) to what the site shows. */
export function toPublicShape<G extends GroupKey>(group: G, value: GroupValue): PublicShapes[G] {
  const shape = ((): PublicShapes[GroupKey] => {
    switch (group) {
      case "contact": {
        const social = (value.social ?? {}) as Record<string, unknown>;
        return {
          phone: str(value.phone),
          email: str(value.email),
          address: str(value.address),
          mapUrl: str(value.mapUrl),
          officeHours: str(value.officeHours),
          social: Object.fromEntries(SOCIAL.filter((platform) => str(social[platform]) !== "").map((platform) => [platform, str(social[platform])])),
        } satisfies ContactInfo;
      }
      case "hero":
        return {
          displaySeconds: num(value.displaySeconds),
          slides: records(value.slides)
            .filter((slide) => slide.visible === true)
            .map((slide) => ({
              id: str(slide.id),
              desktop: slide.desktop as ImageRef,
              mobile: (slide.mobile as ImageRef | null | undefined) ?? null,
              alt: str(slide.alt),
              heading: str(slide.heading),
              button: str(slide.buttonLabel) && str(slide.buttonLink) ? { label: str(slide.buttonLabel), href: str(slide.buttonLink) } : null,
            })),
        } satisfies PublicHero;
      case "stats":
        return {
          students: num(value.students),
          books: num(value.books),
          teachers: num(value.teachers),
          campuses: num(value.campuses),
        } satisfies PublicStats;
      case "video": {
        const youtubeUrl = str(value.youtubeUrl);
        return { youtubeUrl, youtubeId: parseYouTubeAddress(youtubeUrl)?.id ?? null } satisfies PublicVideo;
      }
      case "admission":
        return {
          opensOn: str(value.opensOn),
          closesOn: str(value.closesOn),
          announcement: str(value.announcement),
          closedMessage: str(value.closedMessage),
          classes: records(value.classes)
            .map((item) => ({ levelId: str(item.levelId).trim(), name: str(item.name).trim() }))
            .filter((item) => item.name !== ""),
        } satisfies PublicAdmission;
      case "examination":
        return {
          blocks: records(value.blocks)
            .map((block) => ({ id: str(block.id), heading: str(block.heading).trim(), paragraphs: toParagraphs(str(block.body)) }))
            .filter((block) => block.heading !== "" && block.paragraphs.length > 0),
        } satisfies PublicExamination;
      case "syllabi": {
        const levels = records(value.levels)
          .map((level) => ({
            id: str(level.id),
            name: str(level.name).trim(),
            subjects: records(level.subjects)
              .map((subject) => ({
                id: str(subject.id),
                name: str(subject.name).trim(),
                groups: records(subject.groups)
                  .map((group) => ({
                    id: str(group.id),
                    heading: str(group.heading).trim(),
                    paragraphs: toParagraphs(str(group.intro)),
                    topics: (Array.isArray(group.topics) ? group.topics : []).map((topic) => str(topic).trim()).filter((topic) => topic !== ""),
                  }))
                  .filter((group) => group.paragraphs.length > 0 || group.topics.length > 0),
              }))
              .filter((subject) => subject.name !== "" && subject.groups.length > 0),
          }))
          // A level with no subject has nothing to show, so it is not a tab.
          .filter((level) => level.name !== "" && level.subjects.length > 0);
        const slugs = levelSlugs(levels.map((level) => level.name));
        return { levels: levels.map((level, index) => ({ ...level, slug: slugs[index] })) } satisfies PublicSyllabus;
      }
      case "classLevels": {
        const date = isDayMonth(str(value.ageReferenceDate)) ? str(value.ageReferenceDate) : "07-31";
        return {
          ageReferenceDate: date,
          ageHeader: formatDayMonth(date),
          levels: records(value.levels)
            .map((level) => ({ id: str(level.id), name: str(level.name).trim(), ageRule: str(level.ageRule).trim() }))
            .filter((level) => level.id !== "" && level.name !== ""),
        } satisfies PublicClassLevels;
      }
      case "portalLinks":
        return {
          links: records(value.links)
            .map((link) => ({ id: str(link.id), label: str(link.label).trim(), url: str(link.url).trim() }))
            .filter((link) => link.label !== "" && link.url !== "")
            .map((link) => ({ ...link, insecure: /^http:\/\//i.test(link.url) })),
        } satisfies PublicPortalLinks;
    }
  })();
  return shape as PublicShapes[G];
}

async function readPublic<G extends GroupKey>(group: G): Promise<PublicShapes[G]> {
  const def = GROUPS[group];
  await connectDb();
  const doc = await Settings.findById(group).lean();
  const value = doc ? mergeWithDefaults(def, doc.data) : defaultsFor(def);
  return toPublicShape(group, toLiveValue(def, value));
}

const readers = new Map<GroupKey, () => Promise<unknown>>();

function cachedReader(group: GroupKey): () => Promise<unknown> {
  let reader = readers.get(group);
  if (!reader) {
    reader = unstable_cache(() => readPublic(group), ["settings", group], {
      revalidate: SETTINGS_REVALIDATE_SECONDS,
      tags: [SETTINGS_TAG, settingsGroupTag(group)],
    });
    readers.set(group, reader);
  }
  return reader;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("settings read timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

const lastGood = new Map<GroupKey, unknown>();

export async function getPublicSettings<G extends GroupKey>(group: G): Promise<PublicShapes[G]> {
  try {
    // Test-only: Playwright specs seed the database directly (src/lib/e2e-fresh-reads.ts).
    const read = freshReadsForTests() ? readPublic(group) : cachedReader(group)();
    const value = (await withTimeout(read, SETTINGS_READ_TIMEOUT_MS)) as PublicShapes[G];
    lastGood.set(group, value);
    return value;
  } catch (error) {
    // Next's own control-flow errors (dynamic rendering bail-outs) must pass through.
    unstable_rethrow(error);
    logSecurityEvent({ type: "settings_read_failed", group });
    return (lastGood.get(group) as PublicShapes[G] | undefined) ?? toPublicShape(group, defaultsFor(GROUPS[group]));
  }
}
