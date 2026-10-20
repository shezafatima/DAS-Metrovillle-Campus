import type { Metadata } from "next";
import { AlbumList } from "@/components/admin/gallery/album-list";
import { SettingsPanel } from "@/components/admin/settings/settings-panel";
import { UnsavedPanelsProvider } from "@/components/admin/settings/unsaved-panels";
import { settingsCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminGallery } from "@/lib/gallery/admin";
import { PANELS } from "@/lib/settings/panels";

export const metadata: Metadata = { title: settingsCopy.tabs.resources };
export const dynamic = "force-dynamic";

/**
 * Settings → Resources (014): the Photo gallery album list (007). Albums save
 * per action through their own store (ADR-0005), so the panel holds the list,
 * not a settings form.
 */
export default async function AdminSettingsResourcesPage() {
  await requireAdminPage("pages");
  const initial = await getAdminGallery();
  const panel = PANELS["photo-gallery"];
  return (
    <UnsavedPanelsProvider>
      <SettingsPanel panel={panel.key} title={panel.title} anchor={panel.anchor} viewOnSite={panel.viewOnSite}>
        <AlbumList initial={initial} />
      </SettingsPanel>
    </UnsavedPanelsProvider>
  );
}
