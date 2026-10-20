import { randomUUID } from "node:crypto";
import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { Settings } from "@/models/settings";
import { examinationSeed } from "@/content/seed/examination";
import { portalLinksSeed } from "@/content/seed/portal-links";
import { syllabiSeed } from "@/content/seed/syllabi";
import type { SeedMeta } from "@/content/seed/types";
import { mergeWithDefaults } from "./defaults";
import { reconcileGroupValue, toLiveValue } from "./items";
import type { PanelKey } from "./panels";
import { GROUPS } from "./registry";
import { parseGroup } from "./schema";
import type { GroupKey, GroupValue } from "./types";

/**
 * The one-time seed (014b, spec FR-050–FR-052, research R9, contracts/scripts.md):
 * copies the reference site's Syllabi, Examination text and Portal links into
 * Settings, marked "pending client confirmation". Run by hand only, by
 * `npm run seed:sections -- <section> [--confirm]`.
 *
 *  - A dry run unless `confirm` is set: it validates the data with the group's own
 *    schema and reports what it would write.
 *  - It never overwrites: if the section has ANY live content, even one item, it
 *    refuses, with or without `confirm`.
 *  - A write is one compare-and-set on the group's version (or an insert that the
 *    `_id` key guards), so an admin saving in between makes it stop instead of
 *    overwriting. Removed items already stored are kept, like any save.
 */

export const SEED_ACTOR = "system:014b-seed";
export const SEED_SECTIONS = ["syllabi", "examination", "portal-links"] as const;
export type SeedSection = (typeof SEED_SECTIONS)[number];

export const isSeedSection = (value: unknown): value is SeedSection => typeof value === "string" && (SEED_SECTIONS as readonly string[]).includes(value);

interface Built {
  group: GroupKey;
  panel: PanelKey;
  label: string;
  meta: SeedMeta;
  /** The admin value: items with ids, without the removal marker. */
  value: GroupValue;
  counts: Record<string, number>;
  /** One line per item, for the dry run. */
  lines: string[];
  /** Addresses that will show the "not secure" warning (Portal links). */
  insecure: string[];
  /** True when the live value already has content. */
  hasContent: (live: GroupValue) => boolean;
}

const listLength = (value: unknown) => (Array.isArray(value) ? value.length : 0);

function buildSyllabi(): Built {
  const levels = syllabiSeed.levels.map((level) => ({
    id: randomUUID(),
    name: level.name,
    subjects: level.subjects.map((subject) => ({
      id: randomUUID(),
      name: subject.name,
      groups: subject.groups.map((group) => ({ id: randomUUID(), heading: group.heading ?? "", intro: group.intro ?? "", topics: group.topics })),
    })),
  }));
  const topics = (subject: { groups: { topics: string[] }[] }) => subject.groups.reduce((sum, group) => sum + group.topics.length, 0);
  return {
    group: "syllabi",
    panel: "syllabi",
    label: "Syllabi",
    meta: syllabiSeed,
    value: { levels },
    counts: {
      levels: levels.length,
      subjects: levels.reduce((sum, level) => sum + level.subjects.length, 0),
      groups: levels.reduce((sum, level) => sum + level.subjects.reduce((n, subject) => n + subject.groups.length, 0), 0),
      topics: levels.reduce((sum, level) => sum + level.subjects.reduce((n, subject) => n + topics(subject), 0), 0),
    },
    lines: levels.map((level) => `${level.name}: ${level.subjects.map((subject) => `${subject.name} (${topics(subject)})`).join(", ")}`),
    insecure: [],
    hasContent: (live) => listLength(live.levels) > 0,
  };
}

function buildExamination(): Built {
  const blocks = examinationSeed.blocks.map((block) => ({ id: randomUUID(), heading: block.heading, body: block.body }));
  return {
    group: "examination",
    panel: "examination",
    label: "Examination",
    meta: examinationSeed,
    value: { blocks },
    counts: { blocks: blocks.length },
    lines: blocks.map((block) => `${block.heading}: ${block.body.split("\n\n").length} paragraph(s), ${block.body.length} characters`),
    insecure: [],
    hasContent: (live) => listLength(live.blocks) > 0,
  };
}

function buildPortalLinks(): Built {
  const links = portalLinksSeed.links.map((link) => ({ id: randomUUID(), label: link.label, url: link.url }));
  const insecure = links.filter((link) => /^http:\/\//i.test(link.url)).map((link) => `${link.label}: ${link.url}`);
  return {
    group: "portalLinks",
    panel: "portal-links",
    label: "Portal links",
    meta: portalLinksSeed,
    value: { links },
    counts: { links: links.length, insecure: insecure.length },
    lines: links.map((link) => `${link.label} -> ${link.url}`),
    insecure,
    hasContent: (live) => listLength(live.links) > 0,
  };
}

const BUILDERS: Record<SeedSection, () => Built> = { syllabi: buildSyllabi, examination: buildExamination, "portal-links": buildPortalLinks };

export interface SeedReport {
  section: SeedSection;
  label: string;
  /**
   *  - `dry_run`: validated, nothing written (no `confirm`)
   *  - `written`: the content and the pending flag were written
   *  - `refused_existing`: the section already has content; nothing written
   *  - `gave_up`: the record changed while seeding; nothing written
   *  - `invalid`: the data file does not pass the group's schema (a bug); nothing written
   */
  outcome: "dry_run" | "written" | "refused_existing" | "gave_up" | "invalid";
  source: string;
  counts: Record<string, number>;
  lines: string[];
  adaptations: string[];
  insecure: string[];
  /** Field errors when `outcome` is `invalid`. */
  errors?: Record<string, string>;
}

/**
 * Whether a section's seed data passes its group's own schema (limits included) once ids are added. Needs no
 * database, so a test can prove every data file is valid; `seedSection` runs the same check before it reads anything.
 */
export function checkSeedData(section: SeedSection): { ok: true } | { ok: false; errors: Record<string, string> } {
  const built = BUILDERS[section]();
  const parsed = parseGroup(GROUPS[built.group], built.value);
  return parsed.ok ? { ok: true } : { ok: false, errors: parsed.fields };
}

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

export async function seedSection(section: SeedSection, { confirm = false }: { confirm?: boolean } = {}): Promise<SeedReport> {
  const built = BUILDERS[section]();
  const base = { section, label: built.label, source: built.meta.source, counts: built.counts, lines: built.lines, adaptations: built.meta.adaptations, insecure: built.insecure };

  const def = GROUPS[built.group];
  const parsed = parseGroup(def, built.value);
  if (!parsed.ok) return { ...base, outcome: "invalid", errors: parsed.fields };

  await connectDb();
  const doc = await Settings.findById(built.group).lean();
  const live = toLiveValue(def, mergeWithDefaults(def, doc?.data ?? {}));
  if (built.hasContent(live)) return { ...base, outcome: "refused_existing" };
  if (!confirm) return { ...base, outcome: "dry_run" };

  const now = new Date();
  const reconciled = reconcileGroupValue(def, doc?.data ?? null, parsed.data, now);
  if (!reconciled.ok) return { ...base, outcome: "invalid", errors: { [reconciled.field]: "could not be reconciled" } };

  const pendingConfirmation = { source: built.meta.source, seededAt: now };
  const panelSave = { by: SEED_ACTOR, at: now };
  let written = false;
  if (!doc) {
    try {
      await Settings.create({ _id: built.group, data: reconciled.data, version: 1, updatedBy: SEED_ACTOR, pendingConfirmation, panelSaves: { [built.panel]: panelSave } });
      written = true;
    } catch (error) {
      if (!isDuplicateKey(error)) throw error;
    }
  } else {
    const updated = await Settings.findOneAndUpdate(
      { _id: built.group, version: doc.version },
      { $set: { data: reconciled.data, updatedBy: SEED_ACTOR, pendingConfirmation, [`panelSaves.${built.panel}`]: panelSave }, $inc: { version: 1 } },
      { returnDocument: "after" },
    ).lean();
    written = updated !== null;
  }
  if (!written) return { ...base, outcome: "gave_up" };

  logSecurityEvent({ type: "settings_seeded", group: built.group, panel: built.panel, actor: SEED_ACTOR, counts: built.counts });
  return { ...base, outcome: "written" };
}
