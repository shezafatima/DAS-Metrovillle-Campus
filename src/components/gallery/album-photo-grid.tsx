"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { galleryContent } from "@/content/gallery";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import type { PublicAlbum } from "@/lib/gallery/types";
import { PhotoViewer } from "./photo-viewer";

/**
 * An album's photos as a masonry wall (007 US4): two columns on phones,
 * three from tablet width, thin gaps. Every photo keeps its own shape (its
 * stored width and height), so nothing is cropped, and the columns stack
 * like the client's reference. A caption sits on the bottom edge of its
 * photo. Choosing a photo opens the full-screen viewer on it; closing
 * returns focus to that photo. Images are lazy, so photos below the fold
 * load as the visitor scrolls.
 */
export function AlbumPhotoGrid({ album }: { album: PublicAlbum }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <ul className="columns-2 gap-2 md:columns-3" data-testid="public-photo-grid">
        {album.photos.map((photo, n) => {
          const alt = photo.caption || galleryContent.photoAlt(album.title, n + 1);
          return (
            <li key={photo.id} className="mb-2 break-inside-avoid">
              <button
                type="button"
                aria-label={galleryContent.openPhoto(alt)}
                className="group relative block w-full overflow-hidden rounded-sm bg-neutral-100 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={(event) => {
                  opener.current = event.currentTarget;
                  setOpenIndex(n);
                }}
              >
                <Image
                  src={photo.image.url}
                  alt={alt}
                  width={photo.image.width}
                  height={photo.image.height}
                  loader={cloudinaryLoader}
                  sizes="(min-width: 1280px) 420px, (min-width: 768px) 33vw, 50vw"
                  className="block h-auto w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.02]"
                />
                {photo.caption && (
                  <span
                    dir="auto"
                    className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-left font-body text-white text-xs"
                  >
                    {photo.caption}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <PhotoViewer
        title={album.title}
        photos={album.photos}
        index={openIndex}
        onIndexChange={setOpenIndex}
        onClose={() => setOpenIndex(null)}
        returnFocus={opener}
      />
    </>
  );
}
