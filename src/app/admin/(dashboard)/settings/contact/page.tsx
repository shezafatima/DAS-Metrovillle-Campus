import type { Metadata } from "next";
import { SettingsGroupView } from "@/components/admin/settings/settings-group-view";
import { requireAdminPage } from "@/lib/dal";
import { getAdminSettings } from "@/lib/settings/admin";

export const metadata: Metadata = { title: "Contact & social" };
export const dynamic = "force-dynamic";

/** Settings: Contact & social (005). The access check is here, not in the layout. */
export default async function AdminSettingsContactPage() {
  await requireAdminPage("settings");
  const initial = await getAdminSettings("contact");
  return <SettingsGroupView group="contact" initial={initial} />;
}
