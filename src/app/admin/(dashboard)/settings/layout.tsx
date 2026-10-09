import { SettingsNav } from "@/components/admin/settings/settings-nav";
import { settingsCopy } from "@/content/admin";

/**
 * Chrome for the Settings pages: the title and the group links. This layout
 * is NOT an access gate. Each page under it calls `requireAdminPage("settings")`
 * itself, because a layout does not re-run on client navigation (Next guide
 * "Layouts and auth checks", Constitution III).
 */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">{settingsCopy.pageTitle}</h1>
      <SettingsNav />
      {children}
    </div>
  );
}
