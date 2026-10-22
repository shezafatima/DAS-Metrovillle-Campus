import type { Metadata } from "next";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { SettingsPanelForm } from "@/components/admin/settings/settings-panel-form";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { admissionStatusText, admissionWindowState } from "@/lib/admission/window";
import { requireAdminPage } from "@/lib/dal";
import { offeredClasses } from "@/lib/registration/offered-classes";
import { getAdminPanels } from "@/lib/settings/admin";
import { PANELS, canSavePanel } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs.admission };
export const dynamic = "force-dynamic";

const ADMISSION_PANELS = ["admission-window", "admission-messages", "admission-classes"] as const;

const str = (value: unknown) => (typeof value === "string" ? value : "");
const records = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object") : [];

/**
 * Settings → Admission (014, 014b): the admission record's three panels and the
 * Class Levels panel, in the public page's order (the Class Levels table sits
 * between the procedure and the registration form). The tab opens for Settings
 * or Pages (spec Q1); the window and the open-classes checklist need Settings
 * to save, the messages and Class Levels need Pages, and a panel this user
 * cannot save is shown read-only (the save actions refuse it anyway). The
 * status line (020) and the "open with no classes" warning (013) describe the
 * SAVED values; a save refreshes this page, so they follow.
 */
export default async function AdminSettingsAdmissionPage() {
  const session = await requireAdminPage("settings_or_pages");
  const [panels, classLevels] = await Promise.all([getAdminPanels("admission", ADMISSION_PANELS), getAdminPanels("classLevels", ["class-levels"])]);

  const saved = panels["admission-window"].data as { opensOn?: unknown; closesOn?: unknown };
  const state = admissionWindowState({ opensOn: str(saved.opensOn), closesOn: str(saved.closesOn) }, new Date());

  // The live Class Levels in table order: the checklist ticks from these, and the "no classes" warning counts what the form offers.
  const levels = records(classLevels["class-levels"].data.levels).map((level) => ({ id: str(level.id), name: str(level.name).trim(), ageRule: str(level.ageRule) }));
  const classes = records(panels["admission-classes"].data.classes).map((item) => ({ levelId: str(item.levelId).trim(), name: str(item.name).trim() }));
  const offered = offeredClasses({ classes }, { levels });
  const warning = state.kind === "open" && offered.length === 0 ? settingsCopy.admissionWarnings.noClasses : undefined;
  const levelsPanel = PANELS["class-levels"];

  return (
    <UnsavedPanelsProvider>
      <div className="flex flex-col gap-6">
        {/* The public page's order: window and messages, then the Class Levels table, then the registration list. */}
        {(["admission-window", "admission-messages"] as const).map((key) => {
          const panel = PANELS[key];
          return (
            <SettingsPanel
              key={key}
              panel={key}
              title={panel.title}
              anchor={panel.anchor}
              viewOnSite={panel.viewOnSite}
              status={key === "admission-window" ? admissionStatusText(state) : undefined}
            >
              <SettingsPanelForm key={key} panel={key} initial={panels[key]} readOnly={!canSavePanel(session, panel)} />
            </SettingsPanel>
          );
        })}

        <SettingsPanel panel="class-levels" title={levelsPanel.title} anchor={levelsPanel.anchor} viewOnSite={levelsPanel.viewOnSite}>
          <SettingsPanelForm key="class-levels" panel="class-levels" initial={classLevels["class-levels"]} readOnly={!canSavePanel(session, levelsPanel)} />
        </SettingsPanel>

        <SettingsPanel
          panel="admission-classes"
          title={PANELS["admission-classes"].title}
          anchor={PANELS["admission-classes"].anchor}
          viewOnSite={PANELS["admission-classes"].viewOnSite}
          warning={warning}
        >
          <SettingsPanelForm
            key="admission-classes"
            panel="admission-classes"
            initial={panels["admission-classes"]}
            readOnly={!canSavePanel(session, PANELS["admission-classes"])}
            extra={{ levels: levels.map(({ id, name }) => ({ id, name })) }}
          />
        </SettingsPanel>
      </div>
    </UnsavedPanelsProvider>
  );
}
