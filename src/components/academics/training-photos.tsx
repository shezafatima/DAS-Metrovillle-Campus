import Image from "next/image";
import type { PhotoLayout, Tile } from "@/lib/academics/view";

const FRAME = "relative aspect-academics-photo overflow-hidden rounded-xl bg-surface";

/**
 * The Teachers' Training photo block (research R6, revised): an even row of
 * equal 4:3 frames below the text and video: one framed photo, two across or
 * three across from `md`, one column on phones. Placeholder tiles (development
 * only) carry a visible "Placeholder" badge.
 */
export function TrainingPhotos({ layout, tiles }: { layout: PhotoLayout; tiles: Tile[] }) {
  if (layout === "none" || tiles.length === 0) return null;
  const columns = layout === "single" ? "mx-auto w-full max-w-xl" : tiles.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3";
  return (
    <div data-testid="training-photos" data-layout={layout} className={`grid grid-cols-1 gap-4 ${columns}`}>
      {tiles.map((tile) => {
        return (
          <figure key={tile.id}>
            {tile.placeholder ? (
              <div
                data-placeholder="true"
                aria-hidden="true"
                className={`${FRAME} flex items-center justify-center border-2 border-dashed border-text-muted`}
              >
                <span className="rounded border border-text-muted px-2 py-0.5 font-body text-sm text-text-muted">Placeholder</span>
              </div>
            ) : (
              <div className={FRAME}>
                <Image
                  src={tile.image!.url}
                  alt={tile.alt}
                  fill
                  sizes="(min-width: 1280px) 400px, (min-width: 768px) 33vw, 100vw"
                  className="object-cover"
                />
              </div>
            )}
          </figure>
        );
      })}
    </div>
  );
}
