import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VideoEmbed } from "./video-embed";

const video = { provider: "instagram" as const, embedUrl: "https://www.instagram.com/reel/ABC123xyz/embed/" };
const THIRD_PARTY = /youtube|ytimg|instagram|cdninstagram|fbcdn/;

describe("VideoEmbed", () => {
  it("shows a labelled button and no iframe before the click", () => {
    const { container } = render(<VideoEmbed video={video} title="T" playLabel="Play video: T" poster={null} />);
    expect(screen.getByRole("button", { name: "Play video: T" })).toBeTruthy();
    expect(container.querySelector("iframe")).toBeNull();
  });

  it("makes no third-party reference in the markup with a null or local poster", () => {
    for (const poster of [null, { src: "/images/co-curricular.svg" }]) {
      const { container, unmount } = render(<VideoEmbed video={video} title="T" playLabel="P" poster={poster} />);
      expect(container.innerHTML).not.toMatch(THIRD_PARTY);
      unmount();
    }
  });

  it("shows the emblem placeholder, hidden from assistive tech, when there is no poster", () => {
    const { container } = render(<VideoEmbed video={video} title="T" playLabel="P" poster={null} />);
    const panel = container.querySelector("span.bg-primary")!;
    expect(panel.getAttribute("aria-hidden")).toBe("true");
    expect(panel.querySelector("img")?.getAttribute("src")).toContain("logo-emblem");
  });

  it("loads the iframe in the same 16:9 frame after a click", () => {
    const { container } = render(<VideoEmbed video={video} title="My title" playLabel="P" poster={null} testId="frame" />);
    const frame = container.querySelector("[data-testid=frame]")!;
    fireEvent.click(screen.getByRole("button"));
    const iframe = container.querySelector("iframe")!;
    expect(iframe.getAttribute("src")).toBe(video.embedUrl);
    expect(iframe.getAttribute("title")).toBe("My title");
    expect(iframe.parentElement).toBe(frame);
    expect(frame.className).toContain("aspect-video");
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("keeps the home page's remote thumbnail as a plain lazy img", () => {
    const src = "https://i.ytimg.com/vi/abc/hqdefault.jpg";
    const { container } = render(<VideoEmbed video={video} title="T" playLabel="P" poster={{ src, remote: true }} />);
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe(src);
    expect(img.getAttribute("alt")).toBe("");
    expect(img.getAttribute("loading")).toBe("lazy");
  });
});
