"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { settingsCopy } from "@/content/admin";
import { requireAdminAccess, type AdminSession } from "@/lib/dal";
import { logSecurityEvent } from "@/lib/log";
import { confirmPanel } from "@/lib/settings/confirm";
import { FINGERPRINT_PATTERN } from "@/lib/settings/fingerprint";
import { savePanel } from "@/lib/settings/mutations";
import { SETTINGS_TABS, getPanel, type SaveAccess } from "@/lib/settings/panels";
import { SETTINGS_TAG, settingsGroupTag } from "@/lib/settings/public";
import type { ConfirmPanelResult, SavePanelResult } from "@/lib/settings/types";

/**
 * The Settings panel saves (014, contracts/panel-actions.md, ADR-0013): one
 * action per permission, so the access inventory can prove which permission
 * each panel's save needs. Each starts with `requireAdminAccess(<literal>)`
 * and then accepts only the panels whose save permission is that literal; a
 * panel sent to the other action is refused as forbidden and logged. The
 * acting admin is only ever the session; nothing in the input names an
 * actor. Next checks the request's Origin for every Server Action.
 *
 * A save that succeeds revalidates the settings cache tags and the site, so
 * the admin's next view and the public site's next request read the new
 * values at once.
 */

interface SavePanelInput {
  panel: string;
  expectedFingerprint: string;
  data: unknown;
}

export async function saveSettingsPanel(input: SavePanelInput): Promise<SavePanelResult> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  return savePanelAs("settings", access.session, input);
}

export async function savePagesPanel(input: SavePanelInput): Promise<SavePanelResult> {
  const access = await requireAdminAccess("pages");
  if (!access.ok) return { status: "error", error: access.reason };
  return savePanelAs("pages", access.session, input);
}

interface ConfirmPanelInput {
  panel: string;
}

/**
 * "Mark as confirmed by client" (014b, contracts/panel-actions.md): clears the
 * "pending client confirmation" notice on a seeded section. One action per
 * permission, like the saves, so the access inventory can prove each one.
 */
export async function confirmSettingsPanel(input: ConfirmPanelInput): Promise<ConfirmPanelResult> {
  const access = await requireAdminAccess("settings");
  if (!access.ok) return { status: "error", error: access.reason };
  return confirmPanelAs("settings", access.session, input);
}

export async function confirmPagesPanel(input: ConfirmPanelInput): Promise<ConfirmPanelResult> {
  const access = await requireAdminAccess("pages");
  if (!access.ok) return { status: "error", error: access.reason };
  return confirmPanelAs("pages", access.session, input);
}

async function confirmPanelAs(as: SaveAccess, session: AdminSession, input: ConfirmPanelInput): Promise<ConfirmPanelResult> {
  const panel = getPanel(input?.panel);
  if (!panel || panel.source.kind !== "group") return { status: "error", error: "invalid", fields: { panel: settingsCopy.toasts.invalid } };

  // A panel of the other permission: the caller holds this action's permission but not the panel's.
  if (panel.saveAccess !== as) {
    const headerList = await headers();
    logSecurityEvent({
      type: "access_denied",
      email: session.email,
      access: panel.saveAccess,
      panel: panel.key,
      outcome: headerList.get("x-pathname") ?? "forbidden",
    });
    return { status: "error", error: "forbidden" };
  }

  let result: { changed: boolean };
  try {
    result = await confirmPanel(panel, session.email);
  } catch {
    return { status: "error", error: "unavailable" };
  }
  if (result.changed) {
    const tab = SETTINGS_TABS.find((entry) => entry.panels.includes(panel.key));
    if (tab) revalidatePath(tab.href);
  }
  return { status: "success", changed: result.changed };
}

async function savePanelAs(as: SaveAccess, session: AdminSession, input: SavePanelInput): Promise<SavePanelResult> {
  const panel = getPanel(input?.panel);
  const fingerprint = input?.expectedFingerprint;
  if (!panel || panel.source.kind !== "group" || typeof fingerprint !== "string" || !FINGERPRINT_PATTERN.test(fingerprint)) {
    return { status: "error", error: "invalid", fields: { panel: settingsCopy.toasts.invalid } };
  }

  // A panel sent to the other permission's action: the caller holds this
  // action's permission but not necessarily the panel's.
  if (panel.saveAccess !== as) {
    const headerList = await headers();
    logSecurityEvent({
      type: "access_denied",
      email: session.email,
      access: panel.saveAccess,
      panel: panel.key,
      outcome: headerList.get("x-pathname") ?? "forbidden",
    });
    return { status: "error", error: "forbidden" };
  }

  const result = await savePanel({ panel, expectedFingerprint: fingerprint, data: input.data, actorEmail: session.email });
  if (!result.ok) {
    if (result.error === "invalid" || result.error === "image_rejected") {
      return { status: "error", error: result.error, fields: result.fields };
    }
    return { status: "error", error: result.error };
  }

  const group = panel.source.group;
  // { expire: 0 }: the next request is a fresh read, never stale-then-fresh.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidateTag(settingsGroupTag(group), { expire: 0 });
  revalidatePath("/", "layout");

  logSecurityEvent({ type: "settings_saved", email: session.email, group, panel: panel.key });
  return {
    status: "success",
    version: result.version,
    fingerprint: result.fingerprint,
    data: result.data,
    savedAt: result.savedAt,
    updatedBy: session.email,
  };
}
