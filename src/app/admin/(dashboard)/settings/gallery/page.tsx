import type { Metadata } from "next";
import { AlbumList } from "@/components/admin/gallery/album-list";
import { galleryCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminGallery } from "@/lib/gallery/admin";

export const metadata: Metadata = { title: galleryCopy.pageTitle };
export const dynamic = "force-dynamic";

/** Settings: Photo gallery — the album list (007 US1). The access check is here, not in the layout. */
export default async function AdminSettingsGalleryPage() {
  await requireAdminPage("settings");
  const initial = await getAdminGallery();
  return <AlbumList initial={initial} />;
}
