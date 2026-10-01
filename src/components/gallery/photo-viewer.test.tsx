import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { galleryContent } from "@/content/gallery";
import type { PublicPhoto } from "@/lib/gallery/types";
import { PhotoViewer } from "./photo-viewer";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const photos: PublicPhoto[] = Array.from({ length: 8 }, (_, i) => ({
  id: `p${i}`,
  image: { url: `https://res.cloudinary.com/demo/image/upload/v1/settings/gallery/p${i}.jpg`, publicId: `settings/gallery/p${i}`, width: 8, height: 6 },
  caption: i === 2 ? "Prize giving" : "",
}));

function Harness({ start, onClose = () => {} }: { start: number; onClose?: () => void }) {
  const [index, setIndex] = useState<number | null>(start);
  return (
    <PhotoViewer
      title="Annual Day"
      photos={photos}
      index={index}
      onIndexChange={setIndex}
      onClose={() => {
        setIndex(null);
        onClose();
      }}
    />
  );
}

const position = () => screen.getByTestId("viewer-position").textContent;
const viewer = () => screen.getByTestId("photo-viewer");

describe("PhotoViewer", () => {
  it("opens on the given photo with its position and caption", () => {
    render(<Harness start={2} />);
    expect(screen.getByRole("dialog", { name: "Annual Day" })).toBeInTheDocument();
    expect(position()).toBe("3 of 8");
    expect(screen.getByTestId("viewer-caption")).toHaveTextContent("Prize giving");
  });

  it("moves with the arrow keys and the buttons, without wrapping", () => {
    render(<Harness start={0} />);
    expect(screen.queryByRole("button", { name: galleryContent.viewer.previous })).toBeNull();
    fireEvent.keyDown(viewer(), { key: "ArrowRight" });
    expect(position()).toBe("2 of 8");
    fireEvent.keyDown(viewer(), { key: "ArrowLeft" });
    fireEvent.keyDown(viewer(), { key: "ArrowLeft" });
    expect(position()).toBe("1 of 8");
    for (let i = 0; i < 10; i += 1) fireEvent.click(screen.queryByRole("button", { name: galleryContent.viewer.next }) ?? viewer());
    expect(position()).toBe("8 of 8");
    expect(screen.queryByRole("button", { name: galleryContent.viewer.next })).toBeNull();
  });

  it("closes with Escape and with the close button", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Harness start={1} onClose={onClose} />);
    fireEvent.keyDown(viewer(), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();

    const onClose2 = vi.fn();
    render(<Harness start={1} onClose={onClose2} />);
    fireEvent.click(screen.getByRole("button", { name: galleryContent.viewer.close }));
    expect(onClose2).toHaveBeenCalledTimes(1);
  });

  it("a swipe of more than 50 px moves; a short or vertical one does not", () => {
    render(<Harness start={3} />);
    fireEvent.pointerDown(viewer(), { clientX: 300, clientY: 200 });
    fireEvent.pointerUp(viewer(), { clientX: 200, clientY: 210 });
    expect(position()).toBe("5 of 8");
    fireEvent.pointerDown(viewer(), { clientX: 300, clientY: 200 });
    fireEvent.pointerUp(viewer(), { clientX: 270, clientY: 200 });
    expect(position()).toBe("5 of 8");
    fireEvent.pointerDown(viewer(), { clientX: 300, clientY: 100 });
    fireEvent.pointerUp(viewer(), { clientX: 360, clientY: 300 });
    expect(position()).toBe("5 of 8");
    fireEvent.pointerDown(viewer(), { clientX: 200, clientY: 200 });
    fireEvent.pointerUp(viewer(), { clientX: 300, clientY: 200 });
    expect(position()).toBe("4 of 8");
  });

  it("loads only the open photo and its neighbours", () => {
    render(<Harness start={4} />);
    const srcs = Array.from(viewer().querySelectorAll("img")).map((img) => img.getAttribute("src"));
    expect(srcs.map((s) => s?.match(/p(\d)\.jpg/)?.[1])).toEqual(["3", "4", "5"]);
  });
});
