import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Tile } from "@/lib/academics/view";
import { TrainingPhotos } from "./training-photos";

const real = (n: number): Tile => ({
  id: `photo-${n}`,
  image: { url: `/images/p${n}.svg`, publicId: "", width: 4, height: 3 },
  alt: `Photo ${n}`,
  placeholder: false,
});
const placeholder = (n: number): Tile => ({ id: `placeholder-${n}`, image: null, alt: "", placeholder: true });

describe("TrainingPhotos", () => {
  it("renders nothing for layout none", () => {
    const { container } = render(<TrainingPhotos layout="none" tiles={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders a single framed photo with its alt text", () => {
    const { container } = render(<TrainingPhotos layout="single" tiles={[real(1)]} />);
    expect(container.querySelector("[data-layout=single]")).not.toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(1);
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("Photo 1");
  });

  it("lays 2 photos in two columns and 3 photos in three, from md, with no offsets", () => {
    for (const [tiles, cols] of [
      [[real(1), real(2)], "md:grid-cols-2"],
      [[real(1), real(2), real(3)], "md:grid-cols-3"],
    ] as const) {
      const { container, unmount } = render(<TrainingPhotos layout="collage" tiles={[...tiles]} />);
      const root = container.querySelector("[data-testid=training-photos]")!;
      expect(root.className).toContain(cols);
      expect(root.innerHTML).not.toContain("md:mt-");
      expect(root.innerHTML).not.toContain("col-span");
      unmount();
    }
  });

  it("labels placeholder tiles and gives every frame the photo ratio", () => {
    const { container } = render(<TrainingPhotos layout="collage" tiles={[real(1), placeholder(1), placeholder(2)]} />);
    const tiles = container.querySelectorAll("[data-placeholder=true]");
    expect(tiles).toHaveLength(2);
    for (const t of tiles) {
      expect(t.textContent).toBe("Placeholder");
      expect(t.className).toContain("border-dashed");
      expect(t.querySelector("img")).toBeNull();
    }
    for (const frame of container.querySelectorAll("figure > div")) {
      expect(frame.className).toContain("aspect-academics-photo");
      expect(frame.className).toContain("rounded-xl");
      expect(frame.className).toContain("overflow-hidden");
    }
  });
});
