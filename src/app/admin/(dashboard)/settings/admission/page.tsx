import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { admissionStatusText, admissionWindowState } from "@/lib/admission/window";
import { requireAdminPage } from "@/lib/dal";
import { getAdminPanels } from "@/lib/settings/admin";
import { PANELS, canSavePanel } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs.admission };
export const dynamic = "force-dynamic";

const ADMISSION_PANELS = ["admission-window", "admission-messages", "admission-classes"] as const;

/**
 * Settings → Admission (014): one stored record, three panels. The tab opens
 * for Settings or Pages (spec Q1); the window and the class list need
 * Settings to save, the messages need Pages, and a panel this user cannot
 * save is shown read-only (the save actions refuse it anyway). The status
 * line (020) and the "open with no classes" warning (013) describe the SAVED
 * values; a save refreshes this page, so they follow.
 */
export default async function AdminSettingsAdmissionPage() {
  const session = await requireAdminPage("settings_or_pages");
  const panels = await getAdminPanels("admission", ADMISSION_PANELS);

  const saved = panels["admission-window"].data as { opensOn?: unknown; closesOn?: unknown };
  const state = admissionWindowState(
    { opensOn: typeof saved.opensOn === "string" ? saved.opensOn : "", closesOn: typeof saved.closesOn === "string" ? saved.closesOn : "" },
    new Date(),
  );
  const classes = panels["admission-classes"].data.classes;
  const liveClasses = Array.isArray(classes)
    ? classes.filter((item) => item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && (item as { name: string }).name.trim() !== "").length
    : 0;
  const warning = state.kind === "open" && liveClasses === 0 ? settingsCopy.admissionWarnings.noClasses : undefined;

  return (
    <UnsavedPanelsProvider>
      <div className="flex flex-col gap-6">
        {ADMISSION_PANELS.map((key) => {
          const panel = PANELS[key];
          return (
            <SettingsPanel
              key={key}
              panel={key}
              title={panel.title}
              anchor={panel.anchor}
              viewOnSite={panel.viewOnSite}
              status={key === "admission-window" ? admissionStatusText(state) : undefined}
              warning={key === "admission-classes" ? warning : undefined}
            >
              <SettingsPanelForm key={key} panel={key} initial={panels[key]} readOnly={!canSavePanel(session, panel)} />
            </SettingsPanel>
          );
        })}
      </div>
    </UnsavedPanelsProvider>
  );
}
