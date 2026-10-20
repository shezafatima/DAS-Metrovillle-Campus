import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { Settings } from "@/models/settings";
import type { SettingsPanel } from "./panels";

/**
 * "Mark as confirmed by client" (014b, spec FR-052, research R8): clears the
 * "pending client confirmation" mark that a seed script put on a group's record.
 * One conditional update that only matches while the mark is set, so it is
 * idempotent: a second call (or a double click) changes and logs nothing.
 *
 * It touches only `pendingConfirmation`, never `data`, `version` or the panel
 * saves, so confirming never conflicts with an editor that is open in another tab.
 * Callers check the user's permission for the panel first (the two confirm actions).
 */
export async function confirmPanel(panel: SettingsPanel, actorEmail: string): Promise<{ changed: boolean }> {
  if (panel.source.kind !== "group") throw new Error(`Panel ${panel.key} has no settings group`);
  const group = panel.source.group;
  await connectDb();
  const result = await Settings.updateOne({ _id: group, pendingConfirmation: { $ne: null } }, { $set: { pendingConfirmation: null } });
  const changed = result.modifiedCount === 1;
  if (changed) logSecurityEvent({ type: "settings_confirmed", email: actorEmail, group, panel: panel.key });
  return { changed };
}
