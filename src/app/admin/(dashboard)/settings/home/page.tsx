import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPanels, type AdminPanel } from "@/lib/settings/admin";
import { PANELS } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs.home };
export const dynamic = "force-dynamic";

const HOME_PANELS = ["hero", "video", "stats"] as const;

/**
 * Settings → Home (014): Hero slides, Why Choose video, Progress dashboard, in
 * the home page's order. Each group is read on its own, so one that cannot be
 * loaded shows a message in its panel and the others still work.
 */
export default async function AdminSettingsHomePage() {
  await requireAdminPage("pages");
  const reads = await Promise.allSettled(HOME_PANELS.map((key) => getAdminPanels(key, [key])));
  const loaded: Partial<Record<(typeof HOME_PANELS)[number], AdminPanel>> = {};
  HOME_PANELS.forEach((key, index) => {
    const read = reads[index];
    if (read.status === "fulfilled") loaded[key] = (read.value as Record<string, AdminPanel>)[key];
  });

  return (
    <UnsavedPanelsProvider>
      <div className="flex flex-col gap-6">
        {HOME_PANELS.map((key) => {
          const panel = PANELS[key];
          const initial = loaded[key];
          return (
            <SettingsPanel key={key} panel={key} title={panel.title} anchor={panel.anchor} viewOnSite={panel.viewOnSite}>
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
