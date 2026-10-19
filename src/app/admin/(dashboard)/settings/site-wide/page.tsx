import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPanels } from "@/lib/settings/admin";
import { PANELS } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs["site-wide"] };
export const dynamic = "force-dynamic";

/** Settings → Site-wide (014): contact details, social links, office timings and the map link. */
export default async function AdminSettingsSiteWidePage() {
  await requireAdminPage("settings");
  const panels = await getAdminPanels("contact", ["contact"]);
  const panel = PANELS.contact;
  return (
    <UnsavedPanelsProvider>
      <SettingsPanel panel={panel.key} title={panel.title} anchor={panel.anchor} viewOnSite={panel.viewOnSite}>
        <SettingsPanelForm key={panel.key} panel={panel.key} initial={panels.contact} />
      </SettingsPanel>
    </UnsavedPanelsProvider>
  );
}
