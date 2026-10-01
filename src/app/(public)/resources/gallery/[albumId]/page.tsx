import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlbumPhotoGrid } from "@/components/gallery/album-photo-grid";
import { PageBanner } from "@/components/site-shell/page-banner";
import { formatAlbumDate, galleryContent, photoGalleryBanner } from "@/content/gallery";
import { getPublicAlbum } from "@/lib/gallery/public";
import { ogImageUrl } from "@/lib/news/cloudinary-loader";

export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/resources/gallery/[albumId]">): Promise<Metadata> {
  const { albumId } = await params;
  const album = await getPublicAlbum(albumId);
  if (!album) return { title: galleryContent.albumBanner.title };
  return {
    title: album.title,
    description: album.description || undefined,
    openGraph: { title: album.title, images: [{ url: ogImageUrl(album.cover.url), width: 1200, height: 630 }] },
  };
}

/**
 * One album's page (007 US4). The frame matches the reference Photo Gallery
 * page (screenshots/das.edu.pk_resources_photo-gallery_*.png): the "Photo
 * Gallery" banner with the breadcrumb Home » Resources » Photo Gallery. The
 * reference's gallery module is broken, so the body follows the tokens.
 * Unknown, deleted and empty albums are the standard 404.
 */
export default async function GalleryAlbumPage({ params }: PageProps<"/resources/gallery/[albumId]">) {
  const { albumId } = await params;
  const album = await getPublicAlbum(albumId);
  if (!album) notFound();

  const banner = galleryContent.albumBanner;
  return (
    <>
      <PageBanner
        title={banner.title}
        trail={[...banner.trail]}
        breadcrumbHome={banner.breadcrumbHome}
        backgroundImage={photoGalleryBanner ?? undefined}
      />
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-6 px-(--container-gutter-x) py-section-gap-lg">
        <Link href="/resources#photo-gallery" className="w-fit font-body text-accent text-sm hover:underline">
          ‹ {galleryContent.backToGallery}
        </Link>
        <div className="flex flex-col gap-2">
          <h2 dir="auto" className="break-words font-bold font-heading text-2xl text-primary" data-testid="album-page-title">
            {album.title}
          </h2>
          {album.date && <p className="font-body text-sm text-text">{formatAlbumDate(album.date)}</p>}
          {album.description && (
            <p dir="auto" className="break-words font-body text-body text-text">
              {album.description}
            </p>
          )}
        </div>
        <AlbumPhotoGrid album={album} />
      </div>
    </>
  );
}
