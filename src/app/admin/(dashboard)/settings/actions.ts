"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { settingsCopy } from "@/content/admin";
import { requireAdminAccess } from "@/lib/dal";
import { logSecurityEvent } from "@/lib/log";
import { saveGroup } from "@/lib/settings/mutations";
import { SETTINGS_TAG, settingsGroupTag } from "@/lib/settings/public";
import { getDefinition } from "@/lib/settings/registry";
import type { SaveSettingsResult } from "@/lib/settings/types";

/**
 * Saves one settings group (005, contracts/settings-actions.md). It starts
 * with `requireAdminAccess("settings")`; the acting admin is only ever the
 * session, and nothing in the input names an actor. Next checks the request's
 * Origin against the host for every Server Action (FR-002), the same
 * protection the 010 account and 011 user actions rely on.
 *
 * A save that succeeds revalidates the settings cache tags, so the admin's
 * next view and the public site's next request read the new values at once;
 * anything else reads them within a minute (FR-030).
 */
export async function saveSettingsGroup(input: {
  group: string;
  expectedVersion: number;
  data: unknown;
}): Promise<SaveSettingsResult> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };

  const def = getDefinition(input?.group);
  const version = input?.expectedVersion;
  if (!def || typeof version !== "number" || !Number.isInteger(version) || version < 0) {
    return { status: "error", error: "invalid", fields: { group: settingsCopy.toasts.invalid } };
  }

  const result = await saveGroup({
    group: def.key,
    expectedVersion: version,
    data: input.data,
    actorEmail: access.session.email,
  });

  if (!result.ok) {
    if (result.error === "invalid" || result.error === "image_rejected") {
      return { status: "error", error: result.error, fields: result.fields };
    }
    return { status: "error", error: result.error };
  }

  // { expire: 0 }: the next request is a fresh read, never stale-then-fresh.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidateTag(settingsGroupTag(def.key), { expire: 0 });
  revalidatePath("/", "layout");

  logSecurityEvent({ type: "settings_saved", email: access.session.email, group: def.key });
  return {
    status: "success",
    version: result.version,
    data: result.data,
    savedAt: result.savedAt,
    updatedBy: access.session.email,
  };
}
