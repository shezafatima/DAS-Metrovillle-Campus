import type { Metadata } from "next";
import { SettingsGroupView } from "@/components/admin/settings/settings-group-view";
import { requireAdminPage } from "@/lib/dal";
import { getAdminSettings } from "@/lib/settings/admin";

export const metadata: Metadata = { title: "Hero slides" };
export const dynamic = "force-dynamic";

/** Settings: Hero slides (005). The access check is here, not in the layout. */
export default async function AdminSettingsHeroPage() {
  await requireAdminPage("settings");
  const initial = await getAdminSettings("hero");
  return <SettingsGroupView group="hero" initial={initial} />;
}
