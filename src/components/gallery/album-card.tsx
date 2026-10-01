import Link from "next/link";
import { formatAlbumDate, galleryContent } from "@/content/gallery";
import type { PublicAlbum } from "@/lib/gallery/types";
import { GalleryImage } from "./gallery-image";

/**
 * One album on the Resources Photo Gallery section (007 FR-028): cover,
 * title, photo count and date, all one link to the album page. The reference
 * gallery module is broken (spec Assumptions), so the card reuses the news
 * card tokens from research/design-tokens.md.
 */
export function AlbumCard({ album }: { album: PublicAlbum }) {
  return (
    <article className="flex flex-col border border-(--color-news-card-border) border-b-[3px]" data-testid="public-album-card">
      <Link href={`/resources/gallery/${album.id}`} className="group flex flex-1 flex-col" aria-label={`${album.title}, ${galleryContent.photoCount(album.photoCount)}`}>
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
          <GalleryImage image={album.cover} alt={album.title} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
        <div className="news-card-padding flex flex-1 flex-col gap-2">
          <h3
            dir="auto"
            className="line-clamp-3 break-words font-bold font-heading text-(length:--text-news-card-title) text-primary leading-(--text-news-card-title--line-height) group-hover:underline"
          >
            {album.title}
          </h3>
          <p className="font-body text-(length:--text-news-meta) text-text leading-(--text-news-meta--line-height)">
            {galleryContent.photoCount(album.photoCount)}
            {album.date && (
              <>
                <span aria-hidden="true"> | </span>
                {formatAlbumDate(album.date)}
              </>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
