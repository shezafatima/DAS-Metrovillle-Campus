import type { Metadata } from "next";
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
  const saved = initial.data as { opensOn?: unknown; closesOn?: unknown };
  const state = admissionWindowState(
    { opensOn: typeof saved.opensOn === "string" ? saved.opensOn : "", closesOn: typeof saved.closesOn === "string" ? saved.closesOn : "" },
    new Date(),
  );
  return <SettingsGroupView group="admission" initial={initial} status={admissionStatusText(state)} />;
}
