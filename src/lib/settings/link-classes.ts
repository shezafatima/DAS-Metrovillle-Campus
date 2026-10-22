import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { Settings } from "@/models/settings";
import { mergeWithDefaults } from "./defaults";
import { toLiveValue } from "./items";
import { GROUPS } from "./registry";

/**
 * The class-link migration (014b, spec FR-036, research R6, contracts/scripts.md):
 * links the typed class names in "Classes open for admission" to the Class Levels
 * rows with the same name (trimmed, repeated spaces collapsed, case ignored).
 *
 * Optional: before it runs every typed name reads as "not linked" and is still
 * offered in the registration form, so nothing depends on it. Nothing is dropped:
 * a name with no matching level stays "not linked" and is reported, and so is one
 * whose level another item already ticks. Idempotent: a linked item is never
 * touched, so a second run plans and writes nothing.
 *
 * Run by `npm run migrate:class-levels` (dry run unless `--confirm`), by hand only.
 */

export const LINK_ACTOR = "system:014b-link-classes";
export const MAX_LINK_ATTEMPTS = 3;

const key = (name: string) => name.replace(/\s+/g, " ").trim().toLowerCase();

export interface ClassItem {
  id: string;
  name: string;
  levelId: string;
}
export interface LevelRef {
  id: string;
  name: string;
}

export interface ClassLinkPlan {
  /** Typed names that match a level not yet ticked: they will be linked. */
  linked: { itemId: string; typed: string; level: LevelRef }[];
  /** Typed names with no matching level: kept as "not linked". */
  unmatched: { itemId: string; typed: string }[];
  /** Typed names whose level is already ticked (by another item): kept as "not linked". */
  duplicates: { itemId: string; typed: string; level: LevelRef }[];
}

/**
 * Pure: what the migration would do. Only items with no `levelId` are considered, in saved order;
 * an item with a `levelId` (ticked, or ticked for a level since removed) is left alone.
 */
export function planClassLinks(classes: readonly ClassItem[], levels: readonly LevelRef[]): ClassLinkPlan {
  const byName = new Map<string, LevelRef>();
  for (const level of levels) if (!byName.has(key(level.name))) byName.set(key(level.name), level);
  const taken = new Set(classes.map((item) => item.levelId).filter((id) => id !== ""));

  const plan: ClassLinkPlan = { linked: [], unmatched: [], duplicates: [] };
  for (const item of classes) {
    if (item.levelId !== "") continue;
    const level = byName.get(key(item.name));
    if (!level) {
      plan.unmatched.push({ itemId: item.id, typed: item.name });
    } else if (taken.has(level.id)) {
      plan.duplicates.push({ itemId: item.id, typed: item.name, level });
    } else {
      taken.add(level.id);
      plan.linked.push({ itemId: item.id, typed: item.name, level });
    }
  }
  return plan;
}

export interface LinkReport extends ClassLinkPlan {
  confirmed: boolean;
  /** True when the admission record was changed. */
  written: boolean;
  /** "gave_up" when the record kept changing under the write (3 attempts). */
  outcome: "dry_run" | "nothing_to_link" | "written" | "gave_up";
}

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object") : [];

async function readLive() {
  const admissionDef = GROUPS.admission;
  const levelsDef = GROUPS.classLevels;
  const [admissionDoc, levelsDoc] = await Promise.all([Settings.findById("admission").lean(), Settings.findById("classLevels").lean()]);
  const admission = toLiveValue(admissionDef, mergeWithDefaults(admissionDef, admissionDoc?.data ?? {}));
  const levels = toLiveValue(levelsDef, mergeWithDefaults(levelsDef, levelsDoc?.data ?? {}));
  const classes: ClassItem[] = asRecords(admission.classes).map((item) => ({ id: String(item.id), name: String(item.name ?? ""), levelId: String(item.levelId ?? "") }));
  const levelRefs: LevelRef[] = asRecords(levels.levels).map((level) => ({ id: String(level.id), name: String(level.name ?? "") }));
  return { admissionDoc, classes, levelRefs };
}

export async function linkClasses({ confirm = false }: { confirm?: boolean } = {}): Promise<LinkReport> {
  await connectDb();

  for (let attempt = 0; attempt < MAX_LINK_ATTEMPTS; attempt++) {
    const { admissionDoc, classes, levelRefs } = await readLive();
    const plan = planClassLinks(classes, levelRefs);
    const base = { ...plan, confirmed: confirm, written: false };

    if (plan.linked.length === 0) return { ...base, outcome: "nothing_to_link" };
    if (!confirm) return { ...base, outcome: "dry_run" };
    if (!admissionDoc) return { ...base, outcome: "nothing_to_link" };

    const byItem = new Map(plan.linked.map((entry) => [entry.itemId, entry.level]));
    // The stored list, deleted items included, with only the planned items changed.
    const stored = asRecords(admissionDoc.data?.classes).map((item) => {
      const level = byItem.get(String(item.id));
      return level && !item.deletedAt ? { ...item, levelId: level.id, name: level.name } : item;
    });

    const now = new Date();
    const updated = await Settings.findOneAndUpdate(
      { _id: "admission", version: admissionDoc.version },
      {
        $set: { "data.classes": stored, updatedBy: LINK_ACTOR, "panelSaves.admission-classes": { by: LINK_ACTOR, at: now } },
        $inc: { version: 1 },
      },
      { returnDocument: "after" },
    ).lean();

    if (updated) {
      logSecurityEvent({
        type: "classes_linked",
        group: "admission",
        panel: "admission-classes",
        actor: LINK_ACTOR,
        counts: { linked: plan.linked.length, unmatched: plan.unmatched.length, duplicates: plan.duplicates.length },
      });
      return { ...base, written: true, outcome: "written" };
    }
    // Another save landed between the read and the write: read again and re-plan.
  }

  const { classes, levelRefs } = await readLive();
  return { ...planClassLinks(classes, levelRefs), confirmed: confirm, written: false, outcome: "gave_up" };
}
