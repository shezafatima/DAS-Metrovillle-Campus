import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPanels, type AdminPanel } from "@/lib/settings/admin";
import { PANELS } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs["site-wide"] };
export const dynamic = "force-dynamic";

/** The Site-wide panels, with the group each one edits. */
const SITE_WIDE_PANELS = [
  { key: "contact", group: "contact" },
  { key: "portal-links", group: "portalLinks" },
] as const;

/**
 * Settings → Site-wide (014, 014b): Contact & social, then the footer's Portal
 * links. Each group is read on its own, so one that cannot be loaded shows a
 * message in its panel and the other still works.
 */
export default async function AdminSettingsSiteWidePage() {
  await requireAdminPage("settings");
  const reads = await Promise.allSettled(SITE_WIDE_PANELS.map(({ key, group }) => getAdminPanels(group, [key])));
  const loaded: Partial<Record<(typeof SITE_WIDE_PANELS)[number]["key"], AdminPanel>> = {};
  SITE_WIDE_PANELS.forEach(({ key }, index) => {
    const read = reads[index];
    if (read.status === "fulfilled") loaded[key] = (read.value as Record<string, AdminPanel>)[key];
  });

  return (
    <UnsavedPanelsProvider>
      <div className="flex flex-col gap-6">
        {SITE_WIDE_PANELS.map(({ key }) => {
          const panel = PANELS[key];
          const initial = loaded[key];
          return (
            <SettingsPanel key={key} panel={key} title={panel.title} anchor={panel.anchor} viewOnSite={panel.viewOnSite} pending={initial?.pending} canConfirm>
              {initial ? (
                <SettingsPanelForm key={key} panel={key} initial={initial} />
              ) : (
                <p role="alert" data-testid="panel-unavailable" className="font-semibold text-foreground text-sm">
                  {settingsCopy.panelUnavailable}
                </p>
              )}
            </SettingsPanel>
          );
        })}
      </div>
    </UnsavedPanelsProvider>
  );
}
