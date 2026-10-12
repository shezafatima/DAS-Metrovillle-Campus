import type { TrainingPhoto } from "./schema";

type ImageRef = TrainingPhoto["image"];

export type Tile = { id: string; image: ImageRef | null; alt: string; placeholder: boolean };
export type PhotoLayout = "none" | "single" | "collage";

const MAX_TILES = 3;

/**
 * What the Teachers' Training photo block shows (data-model "Derived view").
 * Production shows only real photos: none gives no block, one a single framed
 * photo, two or three a collage. Development pads up to three with labelled
 * placeholders. Never more than the first three photos.
 */
export function trainingPhotoTiles(
  photos: TrainingPhoto[],
  showPlaceholders: boolean,
): { layout: PhotoLayout; tiles: Tile[] } {
  const real: Tile[] = photos
    .slice(0, MAX_TILES)
    .map((p) => ({ id: p.id, image: p.image, alt: p.alt, placeholder: false }));

  if (showPlaceholders && real.length < 2) {
    const tiles = [...real];
    for (let n = 1; tiles.length < MAX_TILES; n += 1) {
      tiles.push({ id: `placeholder-${n}`, image: null, alt: "", placeholder: true });
    }
    return { layout: "collage", tiles };
  }
  if (real.length === 0) return { layout: "none", tiles: [] };
  return { layout: real.length === 1 ? "single" : "collage", tiles: real };
}
