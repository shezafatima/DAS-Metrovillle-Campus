import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumPhotos } from "@/components/admin/gallery/album-photos";
import { galleryCopy } from "@/content/admin";
import { requireAdminPage } from "@/lib/dal";
import { getAdminAlbum } from "@/lib/gallery/admin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/admin/settings/resources/gallery/[albumId]">): Promise<Metadata> {
  const { albumId } = await params;
  const album = await getAdminAlbum(albumId).catch(() => null);
  return { title: album?.title ?? galleryCopy.pageTitle };
}

/**
 * Settings → Resources: one gallery album's photos (007 US2; under the
 * Resources tab since 014). The access check is here, not in the layout.
 */
export default async function AdminSettingsGalleryAlbumPage({ params }: PageProps<"/admin/settings/resources/gallery/[albumId]">) {
  await requireAdminPage("pages");
  const { albumId } = await params;
  const album = await getAdminAlbum(albumId);
  if (!album) notFound();
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/settings/resources#photo-gallery" className="w-fit font-light text-primary text-sm underline-offset-4 hover:underline">
        {galleryCopy.backToAlbums}
      </Link>
      <AlbumPhotos initial={album} />
    </div>
  );
}
