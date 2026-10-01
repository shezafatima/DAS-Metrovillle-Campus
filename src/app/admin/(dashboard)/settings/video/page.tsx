import type { Metadata } from "next";
import { SettingsGroupView } from "@/components/admin/settings/settings-group-view";
import { requireAdminPage } from "@/lib/dal";
import { getAdminSettings } from "@/lib/settings/admin";

export const metadata: Metadata = { title: "Home video" };
export const dynamic = "force-dynamic";

/** Settings: Home video (005). The access check is here, not in the layout. */
export default async function AdminSettingsVideoPage() {
  await requireAdminPage("settings");
  const initial = await getAdminSettings("video");
  return <SettingsGroupView group="video" initial={initial} />;
}
