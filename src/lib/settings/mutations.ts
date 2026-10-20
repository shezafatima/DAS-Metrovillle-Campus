import { settingsCopy } from "@/content/admin";
import { deleteUploadedImage, verifyUploadedImage } from "@/lib/cloudinary";
import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { Settings } from "@/models/settings";
import { SettingsChange } from "@/models/settings-change";
import { mergeWithDefaults } from "./defaults";
import { panelFingerprint } from "./fingerprint";
import { reconcileGroupValue, toLiveValue } from "./items";
import { PANEL_CHECKS } from "./panel-checks";
import { panelDefinition, type SettingsPanel } from "./panels";
import { GROUPS } from "./registry";
import { removedItems, type RemovedItem } from "./removed-items";
import { collectImages, parseGroup } from "./schema";
import type { GroupKey, GroupValue } from "./types";

export interface SavePanelInput {
  /** A panel whose source is a settings group (the gallery has its own store). */
  panel: SettingsPanel;
  /** The fingerprint the form was loaded with, or the one the last successful save returned. */
  expectedFingerprint: string;
  data: unknown;
  /** The saving admin's email, taken from the session by the caller, never from the request. */
  actorEmail: string;
}

export type SavePanelMutationResult =
  | { ok: true; version: number; fingerprint: string; data: GroupValue; savedAt: string }
  | { ok: false; error: "invalid"; fields: Record<string, string> }
  | { ok: false; error: "image_rejected"; fields: Record<string, string> }
  | { ok: false; error: "conflict" }
  | { ok: false; error: "unavailable" };

/** Write attempts before a save that keeps losing to sibling-panel saves gives up as a conflict. */
export const MAX_SAVE_ATTEMPTS = 3;

function isDuplicateKey(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === 11000;
}

function pick(value: GroupValue, keys: readonly string[]): GroupValue {
  return Object.fromEntries(keys.map((key) => [key, value[key]]));
}

/**
 * Keeps the removed items' previous values (014b, spec FR-007, research R3).
 * Written after the save has succeeded, once retried; if it still fails the
 * save stays a success (no transactions are assumed) and the failure is logged
 * with counts only, so it is visible without ever refusing a save.
 */
async function recordRemovals(group: GroupKey, panelKey: string, actorEmail: string, at: Date, removed: RemovedItem[]): Promise<void> {
  if (removed.length === 0) return;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await SettingsChange.create({ group, panel: panelKey, actorEmail, at, removed });
      return;
    } catch {
      // Retry once, then give up below.
    }
  }
  logSecurityEvent({ type: "settings_change_record_failed", group, panel: panelKey, counts: { removed: removed.length } });
}

/**
 * Saves one Settings panel (014, research R4, ADR-0013): the panel's fields
 * only, into its group's one stored record.
 *
 * 1. The input is parsed with the panel's own definition, so a key outside
 *    the panel is dropped and can never be stored.
 * 2. The stored panel must still match `expectedFingerprint`; otherwise
 *    someone else changed this panel since it was loaded → conflict.
 * 3. The next value is the stored live value with the panel's fields
 *    replaced. It is checked against the whole group's schema, list items
 *    are reconciled (soft delete) and new images verified, as in 005.
 * 4. It is written whole with the group's version compare-and-set. A miss
 *    means another panel of the same group was saved in between: re-read
 *    and repeat from 2, at most MAX_SAVE_ATTEMPTS times.
 *
 * A panel with a registered check (panel-checks.ts) runs it between steps 2
 * and 3: it can refuse the save or adjust the panel's incoming fields.
 * After a successful write, anything the save removed is recorded in
 * `settingsChanges` with its previous value (recordRemovals).
 *
 * So two admins on the same panel cannot overwrite each other, an admin's
 * own save never makes a sibling panel stale, and two saves of different
 * panels both land. No transactions are assumed: each write is one insert
 * (first save, guarded by the `_id` unique key) or one conditional update.
 */
export async function savePanel(input: SavePanelInput): Promise<SavePanelMutationResult> {
  const { panel } = input;
  if (panel.source.kind !== "group") return { ok: false, error: "invalid", fields: { panel: settingsCopy.toasts.invalid } };
  const fields = panel.source.fields;
  const groupKey = panel.source.group;
  const def = GROUPS[groupKey];

  const parsed = parseGroup(panelDefinition(panel), input.data);
  if (!parsed.ok) return { ok: false, error: "invalid", fields: parsed.fields };
  const incoming = pick(parsed.data, fields);

  try {
    await connectDb();
    for (let attempt = 0; attempt < MAX_SAVE_ATTEMPTS; attempt++) {
      const stored = await Settings.findById(groupKey).lean();
      const storedVersion = stored?.version ?? 0;
      const storedLive = toLiveValue(def, mergeWithDefaults(def, stored?.data ?? {}));
      if (panelFingerprint(fields, storedLive) !== input.expectedFingerprint) return { ok: false, error: "conflict" };

      let panelIncoming = incoming;
      const check = PANEL_CHECKS[panel.key];
      if (check) {
        const verdict = await check(incoming);
        if (!verdict.ok) return verdict.error === "conflict" ? { ok: false, error: "conflict" } : { ok: false, error: "invalid", fields: verdict.fields };
        panelIncoming = pick(verdict.data, fields);
      }

      // The whole group must still be valid, but only the panel's fields are
      // taken from the parse: the other panels' values are stored exactly as
      // they were, so their fingerprints cannot shift under them.
      const merged = { ...storedLive, ...panelIncoming };
      const whole = parseGroup(def, merged);
      if (!whole.ok) return { ok: false, error: "invalid", fields: whole.fields };

      const now = new Date();
      const reconciled = reconcileGroupValue(def, stored?.data ?? null, merged, now);
      if (!reconciled.ok) {
        return { ok: false, error: "invalid", fields: { [reconciled.field]: settingsCopy.errors.unknownItem } };
      }

      // Only images this save introduces are checked; ones already stored were checked when they were saved.
      const alreadyStored = new Set(collectImages(def, stored?.data).map((image) => image.publicId));
      for (const image of collectImages(def, merged)) {
        if (alreadyStored.has(image.publicId)) continue;
        const verdict = await verifyUploadedImage(image.publicId, image.folder);
        if (verdict.ok) continue;
        if (verdict.reason === "unavailable") return { ok: false, error: "unavailable" };
        await deleteUploadedImage(image.publicId);
        return { ok: false, error: "image_rejected", fields: { [image.path]: settingsCopy.errors.imageLimits } };
      }

      const panelSave = { by: input.actorEmail, at: now };
      let version: number | null = null;
      if (storedVersion === 0) {
        try {
          await Settings.create({
            _id: groupKey,
            data: reconciled.data,
            version: 1,
            updatedBy: input.actorEmail,
            panelSaves: { [panel.key]: panelSave },
          });
          version = 1;
        } catch (error) {
          if (!isDuplicateKey(error)) throw error;
        }
      } else {
        const updated = await Settings.findOneAndUpdate(
          { _id: groupKey, version: storedVersion },
          {
            // pendingConfirmation (014b) must never be named here: only the seed script sets it and only the confirm actions clear it.
            $set: { data: reconciled.data, updatedBy: input.actorEmail, [`panelSaves.${panel.key}`]: panelSave },
            $inc: { version: 1 },
          },
          { returnDocument: "after" },
        ).lean();
        if (updated) version = updated.version;
      }

      if (version !== null) {
        const live = toLiveValue(def, reconciled.data);
        // The first save of a group has nothing stored to lose: what it replaces is the starting content in the code
        // (the default hero slide), which is not a removal by an admin and can be read from the code, so no record.
        if (storedVersion > 0) await recordRemovals(groupKey, panel.key, input.actorEmail, now, removedItems(def, storedLive, live));
        return {
          ok: true,
          version,
          fingerprint: panelFingerprint(fields, live),
          data: pick(live, fields),
          savedAt: now.toISOString(),
        };
      }
      // Lost the write to another save of this group: re-read and check again.
    }
    return { ok: false, error: "conflict" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}
