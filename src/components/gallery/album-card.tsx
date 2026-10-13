import Link from "next/link";
import { formatAlbumDate, galleryContent } from "@/content/gallery";
import type { PublicAlbum } from "@/lib/gallery/types";
import { GalleryImage } from "./gallery-image";

/**
 * One album on the Resources Photo Gallery section (007 FR-028): the cover
 * fills a 4:3 card, with the title over a dark gradient at the bottom and the
 * photo count as a badge, all one link to the album page. Hover and keyboard
 * focus zoom the photo and deepen the gradient (transform and opacity only,
 * motion-safe).
 */
export function AlbumCard({ album }: { album: PublicAlbum }) {
  const count = galleryContent.photoCount(album.photoCount);
  return (
    <article data-testid="public-album-card">
      <Link
        href={`/resources/gallery/${album.id}`}
        aria-label={`${album.title}, ${count}`}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-(--radius-card) bg-neutral-100 shadow-(--shadow-card) outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="absolute inset-0 motion-safe:transition-transform motion-safe:duration-(--motion-fast) motion-safe:group-hover:scale-105 motion-safe:group-focus-visible:scale-105">
          <GalleryImage image={album.cover} alt={album.title} sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw" />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/75 via-black/30 to-transparent" />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-black/50 to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-(--motion-fast) group-hover:opacity-100 group-focus-visible:opacity-100"
        />
        <span className="absolute top-3 right-3 rounded-full bg-black/60 px-3 py-1 font-body text-sm text-white">{count}</span>
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 md:p-5">
          <h3 dir="auto" className="line-clamp-2 break-words font-bold font-heading text-white text-xl leading-snug">
            {album.title}
          </h3>
          {album.date && <p className="font-body text-sm text-white">{formatAlbumDate(album.date)}</p>}
        </div>
      </Link>
    </article>
  );
}
