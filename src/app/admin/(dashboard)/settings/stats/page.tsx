import type { Metadata } from "next";
import { SettingsGroupView } from "@/components/admin/settings/settings-group-view";
import { requireAdminPage } from "@/lib/dal";
import { getAdminSettings } from "@/lib/settings/admin";

export const metadata: Metadata = { title: "Stats" };
export const dynamic = "force-dynamic";

/** Settings: Stats (005). The access check is here, not in the layout. */
export default async function AdminSettingsStatsPage() {
  await requireAdminPage("settings");
  const initial = await getAdminSettings("stats");
  return <SettingsGroupView group="stats" initial={initial} />;
}
