import { SettingsNav } from "@/components/admin/settings/settings-nav";
import { settingsCopy } from "@/content/admin";
import { getAdminSession } from "@/lib/dal";
import { visibleTabs } from "@/lib/settings/panels";

/**
 * Chrome for the Settings tabs (014): the title and the tab bar. The tabs
 * shown are the ones this user may open (presentation only). This layout is
 * NOT an access gate: each tab page calls `requireAdminPage(...)` itself,
 * because a layout does not re-run on client navigation (Next guide "Layouts
 * and auth checks", Constitution III).
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();
  const tabs = session ? visibleTabs(session).map(({ key, label, href }) => ({ key, label, href })) : [];
  return (
    <div className="flex min-w-0 flex-col gap-6 p-6">
      <h1 className="font-bold text-2xl text-foreground">{settingsCopy.pageTitle}</h1>
      <SettingsNav tabs={tabs} />
      {children}
    </div>
  );
}
