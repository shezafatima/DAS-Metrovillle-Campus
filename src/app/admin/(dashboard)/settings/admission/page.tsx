import type { Metadata } from "next";
import { settingsCopy } from "@/content/admin";
import { SettingsGroupView } from "@/components/admin/settings/settings-group-view";
import { admissionStatusText, admissionWindowState } from "@/lib/admission/window";
import { requireAdminPage } from "@/lib/dal";
import { getAdminSettings } from "@/lib/settings/admin";

export const metadata: Metadata = { title: "Admission" };
export const dynamic = "force-dynamic";

/**
 * Settings: Admission (020). The access check is here, not in the layout. The
 * status line describes the SAVED window as the public sees it now; a save
 * refreshes this page, so it follows the new values.
 */
export default async function AdminSettingsAdmissionPage() {
  await requireAdminPage("settings");
  const initial = await getAdminSettings("admission");
  const saved = initial.data as { opensOn?: unknown; closesOn?: unknown; classes?: unknown };
  const state = admissionWindowState(
    { opensOn: typeof saved.opensOn === "string" ? saved.opensOn : "", closesOn: typeof saved.closesOn === "string" ? saved.closesOn : "" },
    new Date(),
  );
  // 013: an open window with no class listed hides the registration form; say so here.
  const liveClasses = Array.isArray(saved.classes)
    ? saved.classes.filter((item) => item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && (item as { name: string }).name.trim() !== "").length
    : 0;
  const warning = state.kind === "open" && liveClasses === 0 ? settingsCopy.admissionWarnings.noClasses : undefined;
  return <SettingsGroupView group="admission" initial={initial} status={admissionStatusText(state)} warning={warning} />;
}
