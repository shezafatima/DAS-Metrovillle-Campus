import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hifzEQuran } from "@/content/academics";
import { HifzEQuranSection } from "./hifz-e-quran";

describe("HifzEQuranSection", () => {
  it("renders the surface section with the heading exactly as stored and no case transform", () => {
    const { container } = render(<HifzEQuranSection value={hifzEQuran} />);
    const section = container.querySelector("section#hifz-e-quran");
    expect(section?.getAttribute("data-background")).toBe("surface");
    const h2 = container.querySelector("h2")!;
    expect(h2.textContent).toBe("HIFZ-UL-QURAN PROGRAM");
    for (let el: Element | null = h2; el; el = el.parentElement) {
      expect(el.className).not.toMatch(/\b(uppercase|capitalize|lowercase)\b/);
    }
  });

  it("puts the heading in a yellow band and the intro across the full width above the sub-sections", () => {
    const { container } = render(<HifzEQuranSection value={hifzEQuran} video={<div />} />);
    const band = container.querySelector("[data-testid=heading-band]")!;
    expect(band.className).toContain("bg-topbar");
    expect(band.contains(container.querySelector("h2"))).toBe(true);
    const intro = [...container.querySelectorAll("p")].find((p) => p.textContent === hifzEQuran.intro)!;
    expect(intro.closest(".max-w-prose")).toBeNull();
    const grid = container.querySelector('[class*="md:grid-cols-12"]')!;
    expect(grid.contains(intro)).toBe(false);
    expect(intro.compareDocumentPosition(grid) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders the subheading, the intro and two h3 each followed by its icon points", () => {
    const { container } = render(<HifzEQuranSection value={hifzEQuran} />);
    expect(container.textContent).toContain(hifzEQuran.subheading);
    expect(container.textContent).toContain(hifzEQuran.intro);
    const h3s = [...container.querySelectorAll("h3")];
    expect(h3s.map((h) => h.textContent)).toEqual(["Admission Based on Aptitude", "Hifz Alongside Academic Education"]);
    for (const h3 of h3s) {
      const lis = h3.parentElement!.querySelectorAll("ul > li");
      expect(lis).toHaveLength(2);
      for (const li of lis) expect(li.querySelector("span[aria-hidden=true] svg")).not.toBeNull();
    }
  });

  it("draws no video block without a video, and draws it beside the text with one", () => {
    const without = render(<HifzEQuranSection value={hifzEQuran} />);
    expect(without.container.querySelector("[data-testid=hifz-video]")).toBeNull();
    without.unmount();

    const { container } = render(<HifzEQuranSection value={hifzEQuran} video={<div data-testid="inner" />} />);
    const wrapper = container.querySelector("[data-testid=hifz-video]")!;
    expect(wrapper.querySelector("[data-testid=inner]")).not.toBeNull();
    const grid = container.querySelector(".grid")!;
    expect(grid.children[0].querySelector("h3")).not.toBeNull();
    expect(grid.children[1]).toBe(wrapper);
  });
});
