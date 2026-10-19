import { connectDb } from "@/lib/db";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { Settings } from "@/models/settings";
import { defaultsFor, mergeWithDefaults } from "./defaults";
import { panelFingerprint } from "./fingerprint";
import { toLiveValue } from "./items";
import { PANELS, type PanelKey } from "./panels";
import { GROUPS } from "./registry";
import type { GroupKey, GroupValue } from "./types";

export interface AdminSettings {
  /** List items are live only, without the `deletedAt` marker. */
  data: GroupValue;
  /** 0 when the group has never been saved (the form shows the starting values). */
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * What the admin form loads for one group. Callers must have passed the
 * page's access check first. A group that was never saved (or has gained
 * fields since it was saved) is filled from the definition defaults.
 */
export async function getAdminSettings(group: GroupKey): Promise<AdminSettings> {
  const def = GROUPS[group];
  await connectDb();
  const doc = await Settings.findById(group).lean();
  if (!doc) return { data: defaultsFor(def), version: 0, updatedAt: null, updatedBy: null };
  return {
    data: toLiveValue(def, mergeWithDefaults(def, doc.data)),
    version: doc.version,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    updatedBy: doc.updatedBy ?? null,
  };
}

/** What one panel's form loads (014). */
export interface AdminPanel {
  /** The panel's fields only, live list items, defaults merged. */
  data: GroupValue;
  /** Sent back with the save; see src/lib/settings/fingerprint.ts. */
  fingerprint: string;
  /** This panel's last save, else the record's (saved before 014), else null (never saved). */
  lastSaved: { by: string; at: string } | null;
}

/**
 * Test-only (014 spec, "Settings read fails"): with E2E_FRESH_READS=1, the
 * cookie `e2e-settings-read-fail=<group>[,<group>]` makes those groups' admin
 * reads fail, so the E2E spec can show one Home panel failing on its own.
 * Never honoured in production; `cookies()` is not even read there.
 */
async function failReadForTests(group: GroupKey): Promise<void> {
  if (!freshReadsForTests()) return;
  const { cookies } = await import("next/headers");
  const failing = (await cookies()).get("e2e-settings-read-fail")?.value?.split(",") ?? [];
  if (failing.includes(group)) throw new Error(`e2e: settings read for ${group} forced to fail`);
}

function iso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Loads the panels of one group from a single read (014; the Admission tab's
 * three panels share one record). Callers must have passed the tab's access
 * check first. Throws when the store is unreachable, like getAdminSettings.
 */
export async function getAdminPanels<K extends PanelKey>(group: GroupKey, panelKeys: readonly K[]): Promise<Record<K, AdminPanel>> {
  const def = GROUPS[group];
  await failReadForTests(group);
  await connectDb();
  const doc = await Settings.findById(group).lean();
  const live = toLiveValue(def, mergeWithDefaults(def, doc?.data ?? {}));
  const panelSaves = (doc?.panelSaves ?? {}) as Record<string, { by?: unknown; at?: unknown } | undefined>;

  const out = {} as Record<K, AdminPanel>;
  for (const key of panelKeys) {
    const panel = PANELS[key];
    if (panel.source.kind !== "group" || panel.source.group !== group) throw new Error(`Panel ${key} is not part of ${group}`);
    const fields = panel.source.fields;
    const own = panelSaves[key];
    const ownAt = iso(own?.at);
    const recordAt = iso(doc?.updatedAt);
    const lastSaved =
      own && typeof own.by === "string" && ownAt
        ? { by: own.by, at: ownAt }
        : doc && doc.updatedBy && recordAt
          ? { by: doc.updatedBy, at: recordAt }
          : null;
    out[key] = {
      data: Object.fromEntries(fields.map((field) => [field, live[field]])),
      fingerprint: panelFingerprint(fields, live),
      lastSaved,
    };
  }
  return out;
}
