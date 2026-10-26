import "server-only";
import { settingsCopy } from "@/content/admin";
import { karachiToday } from "@/lib/admission/window";
import { connectDb } from "@/lib/db";
import { Settings } from "@/models/settings";
import { mergeWithDefaults } from "./defaults";
import { toLiveValue } from "./items";
import { changedPastDates } from "./past-dates";
import type { PanelKey } from "./panels";
import { GROUPS } from "./registry";
import type { GroupValue } from "./types";

/**
 * Per-panel server checks that need the database (014b, research R7). A check
 * runs inside `savePanel`, after the panel's fingerprint matched and before
 * the merged group is validated and written, so a refusal writes nothing.
 * Only `admission-classes` has one (it refuses a reference to a Class Level
 * that no longer exists, and refreshes the stored name snapshots); the others
 * go straight through.
 *
 * Kept out of the pure `panels.ts` registry, which the client also imports and
 * which must stay free of server and database code.
 */
export type PanelCheckResult =
  | { ok: true; data: GroupValue }
  | { ok: false; error: "conflict" }
  | { ok: false; error: "invalid"; fields: Record<string, string> };

/** `incoming` is the panel's own fields, already parsed with the panel's schema. */
export type PanelCheck = (incoming: GroupValue) => Promise<PanelCheckResult>;

/** The live Class Levels (soft-deleted rows excluded), from one read. */
async function liveClassLevels(): Promise<{ id: string; name: string }[]> {
  await connectDb();
  const def = GROUPS.classLevels;
  const doc = await Settings.findById("classLevels").lean();
  const live = toLiveValue(def, mergeWithDefaults(def, doc?.data ?? {}));
  return (Array.isArray(live.levels) ? (live.levels as Record<string, unknown>[]) : []).map((level) => ({ id: String(level.id), name: String(level.name ?? "") }));
}

/** The ids of the items currently stored (live) in "Classes open for admission". */
async function storedClassItemIds(): Promise<Set<string>> {
  await connectDb();
  const doc = await Settings.findById("admission").lean();
  const items = Array.isArray(doc?.data?.classes) ? (doc.data.classes as Record<string, unknown>[]) : [];
  return new Set(items.filter((item) => !item.deletedAt).map((item) => String(item.id)));
}

/**
 * "Classes open for admission" (014b, research R5/R7): every ticked item must point
 * at a Class Level that still exists.
 *
 *  - A NEW tick (an item that is not stored yet) for a level that no longer exists
 *    makes the save a conflict: the admin reloads, sees the current levels, and ticks
 *    again. Nothing is written.
 *  - An item that is already stored but whose level has since been deleted is the
 *    removed-level warning's leftover. It is not offered anywhere, and saving the
 *    checklist acknowledges it (spec FR-035), so it is dropped here, not refused.
 *  - Each linked item's `name` is set to the level's current name, so the stored
 *    snapshot is never stale. Items with no `levelId` (typed names not linked yet)
 *    pass through untouched.
 */
const checkAdmissionClasses: PanelCheck = async (incoming) => {
  const items = Array.isArray(incoming.classes) ? (incoming.classes as Record<string, unknown>[]) : [];
  if (!items.some((item) => String(item.levelId ?? "") !== "")) return { ok: true, data: incoming };

  const byId = new Map((await liveClassLevels()).map((level) => [level.id, level]));
  let stored: Set<string> | null = null;
  const next: Record<string, unknown>[] = [];
  for (const item of items) {
    const levelId = String(item.levelId ?? "");
    if (levelId === "") {
      next.push(item);
      continue;
    }
    const level = byId.get(levelId);
    if (level) {
      next.push({ ...item, name: level.name });
      continue;
    }
    stored ??= await storedClassItemIds();
    if (stored.has(String(item.id))) continue; // a leftover of a level removed earlier: saving acknowledges it
    return { ok: false, error: "conflict" };
  }
  return { ok: true, data: { ...incoming, classes: next } };
};

/**
 * "Admission window" (027): Opens on and Closes on may not be moved to a day that has already passed. The
 * picker starts at today, and this stops a typed or scripted past date. A date left as it is (even a past one, as
 * when the window opened last week) and a cleared date are fine, so the rest of the panel can still be saved.
 */
const checkAdmissionWindow: PanelCheck = async (incoming) => {
  await connectDb();
  const stored = (await Settings.findById("admission").lean())?.data ?? {};
  const keys = changedPastDates(GROUPS.admission.fields, incoming, stored, karachiToday(new Date()));
  if (keys.length === 0) return { ok: true, data: incoming };
  return { ok: false, error: "invalid", fields: Object.fromEntries(keys.map((key) => [key, settingsCopy.errors.dateInPast])) };
};

export const PANEL_CHECKS: Partial<Record<PanelKey, PanelCheck>> = {
  "admission-classes": checkAdmissionClasses,
  "admission-window": checkAdmissionWindow,
};

function assertTestEnvironment(): void {
  if (!process.env.VITEST) throw new Error("Panel checks can only be registered or cleared from tests");
}

/** Test seam: registers a check for a panel. Throws outside Vitest. */
export function registerPanelCheckForTests(key: PanelKey, check: PanelCheck): void {
  assertTestEnvironment();
  PANEL_CHECKS[key] = check;
}

/** Test seam: removes a check registered by `registerPanelCheckForTests`. Throws outside Vitest. */
export function clearPanelCheckForTests(key: PanelKey): void {
  assertTestEnvironment();
  delete PANEL_CHECKS[key];
}
