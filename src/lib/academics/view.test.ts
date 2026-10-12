import { describe, expect, it } from "vitest";
import type { TrainingPhoto } from "./schema";
import { trainingPhotoTiles } from "./view";

const photo = (n: number): TrainingPhoto => ({
  id: `photo-${n}`,
  image: { url: `/images/p${n}.svg`, publicId: "", width: 4, height: 3 },
  alt: `Photo ${n}`,
});
const photos = (n: number) => Array.from({ length: n }, (_, i) => photo(i + 1));

describe("trainingPhotoTiles — production", () => {
  it("0 photos: no block", () => {
    expect(trainingPhotoTiles([], false)).toEqual({ layout: "none", tiles: [] });
  });
  it("1 photo: a single framed photo", () => {
    const v = trainingPhotoTiles(photos(1), false);
    expect(v.layout).toBe("single");
    expect(v.tiles.map((t) => t.id)).toEqual(["photo-1"]);
  });
  it("2 and 3 photos: a collage of the real photos", () => {
    for (const n of [2, 3]) {
      const v = trainingPhotoTiles(photos(n), false);
      expect(v.layout).toBe("collage");
      expect(v.tiles).toHaveLength(n);
      expect(v.tiles.every((t) => !t.placeholder)).toBe(true);
    }
  });
  it("4 photos: sliced to the first 3", () => {
    expect(trainingPhotoTiles(photos(4), false).tiles.map((t) => t.id)).toEqual(["photo-1", "photo-2", "photo-3"]);
  });
});

describe("trainingPhotoTiles — development", () => {
  it("0 photos: a collage of 3 labelled placeholders", () => {
    const v = trainingPhotoTiles([], true);
    expect(v.layout).toBe("collage");
    expect(v.tiles.map((t) => t.id)).toEqual(["placeholder-1", "placeholder-2", "placeholder-3"]);
    expect(v.tiles.every((t) => t.placeholder && t.image === null && t.alt === "")).toBe(true);
  });
  it("1 photo: the photo first, then 2 placeholders", () => {
    const v = trainingPhotoTiles(photos(1), true);
    expect(v.layout).toBe("collage");
    expect(v.tiles.map((t) => [t.id, t.placeholder])).toEqual([
      ["photo-1", false],
      ["placeholder-1", true],
      ["placeholder-2", true],
    ]);
  });
  it("2 and 3 photos: real photos only", () => {
    expect(trainingPhotoTiles(photos(2), true).tiles.every((t) => !t.placeholder)).toBe(true);
    expect(trainingPhotoTiles(photos(3), true).tiles).toHaveLength(3);
  });
  it("4 photos: sliced to the first 3", () => {
    expect(trainingPhotoTiles(photos(4), true).tiles).toHaveLength(3);
  });
});
