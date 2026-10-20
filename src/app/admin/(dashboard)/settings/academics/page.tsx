import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPanels, type AdminPanel } from "@/lib/settings/admin";
import { PANELS, canSavePanel, type PanelKey } from "@/lib/settings/panels";
import type { GroupKey } from "@/lib/settings/types";

export const metadata: Metadata = { title: settingsCopy.tabs.academics };
export const dynamic = "force-dynamic";

/** The Academics panels, with the group each one edits, in the public page's order. */
const ACADEMICS_PANELS: readonly { key: PanelKey; group: GroupKey }[] = [
  { key: "syllabi", group: "syllabi" },
  { key: "examination", group: "examination" },
];

/**
 * Settings → Academics (014b): the Syllabi and Examination sections of the
 * Academics page. Page content, so the tab needs Pages. Each group is read on
 * its own, so one that cannot be loaded shows a message in its panel and the
 * other still works.
 */
export default async function AdminSettingsAcademicsPage() {
  const session = await requireAdminPage("pages");
  const reads = await Promise.allSettled(ACADEMICS_PANELS.map(({ key, group }) => getAdminPanels(group, [key])));
  const loaded: Partial<Record<PanelKey, AdminPanel>> = {};
  ACADEMICS_PANELS.forEach(({ key }, index) => {
    const read = reads[index];
    if (read.status === "fulfilled") loaded[key] = (read.value as Record<string, AdminPanel>)[key];
  });

  return (
    <UnsavedPanelsProvider>
      <div className="flex flex-col gap-6">
        {ACADEMICS_PANELS.map(({ key }) => {
          const panel = PANELS[key];
          const initial = loaded[key];
          return (
            <SettingsPanel key={key} panel={key} title={panel.title} anchor={panel.anchor} viewOnSite={panel.viewOnSite} pending={initial?.pending} canConfirm={canSavePanel(session, panel)}>
              {initial ? (
                <SettingsPanelForm key={key} panel={key} initial={initial} readOnly={!canSavePanel(session, panel)} />
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
