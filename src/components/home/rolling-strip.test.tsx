import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RollingStrip, ROLL_SIZES, type RollItem } from "./rolling-strip";

const covers = (n: number): RollItem[] => Array.from({ length: n }, (_, i) => ({ id: `book-${i + 1}`, src: `/images/home/books/book-0${i + 1}.jpg`, alt: `Book ${i + 1}` }));
const logos = (n: number, linked = false): RollItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, src: `/images/home/partners/p${i + 1}.png`, alt: `Partner ${i + 1} logo`, name: `Partner ${i + 1}`, href: linked ? `/partners/${i + 1}` : undefined, aspect: 1 }));

describe("RollingStrip (books)", () => {
  it("loops with three or more covers, and every repeated copy is hidden from assistive technology", () => {
    render(<RollingStrip label="Books" items={covers(3)} />);
    const roll = screen.getByTestId("book-roll");
    expect(roll).toHaveAttribute("data-mode", "loop");
    for (const cover of covers(3)) expect(screen.getAllByRole("img", { name: cover.alt })).toHaveLength(1);
    const copies = screen.getAllByTestId("book-cover-copy");
    expect(copies.length).toBeGreaterThanOrEqual(3);
    for (const copy of copies) {
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy.querySelector("img")).toHaveAttribute("alt", "");
    }
    expect(roll.querySelectorAll("li").length % 2).toBe(0);
    expect(roll.querySelectorAll(".roll-fade")).toHaveLength(2);
  });

  it("shows one or two covers as a still, centred row with no copies and no fade", () => {
    for (const n of [1, 2]) {
      const { unmount } = render(<RollingStrip label="Books" items={covers(n)} />);
      const roll = screen.getByTestId("book-roll");
      expect(roll).toHaveAttribute("data-mode", "static");
      expect(screen.queryAllByTestId("book-cover-copy")).toHaveLength(0);
      expect(screen.getAllByTestId("book-cover")).toHaveLength(n);
      expect(roll.querySelectorAll(".roll-fade")).toHaveLength(0);
      unmount();
    }
  });

  it("is focusable, so a keyboard user can stop it, and pauses while focused", () => {
    render(<RollingStrip label="Books" items={covers(4)} />);
    const roll = screen.getByTestId("book-roll");
    expect(roll).toHaveAttribute("tabindex", "0");
    expect(roll).toHaveAttribute("data-paused", "false");
    fireEvent.focus(roll);
    expect(roll).toHaveAttribute("data-paused", "true");
    fireEvent.blur(roll);
    expect(roll).toHaveAttribute("data-paused", "false");
  });

  it("pauses while the pointer is over it and while the browser tab is hidden", () => {
    render(<RollingStrip label="Books" items={covers(4)} />);
    const roll = screen.getByTestId("book-roll");
    fireEvent.pointerEnter(roll, { pointerType: "mouse" });
    expect(roll).toHaveAttribute("data-paused", "true");
    fireEvent.pointerLeave(roll, { pointerType: "mouse" });
    expect(roll).toHaveAttribute("data-paused", "false");

    Object.defineProperty(document, "hidden", { value: true, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(roll).toHaveAttribute("data-paused", "true");
    Object.defineProperty(document, "hidden", { value: false, configurable: true });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(roll).toHaveAttribute("data-paused", "false");
  });

  it("runs forward by default, with the navy fade", () => {
    render(<RollingStrip label="Books" items={covers(4)} />);
    const roll = screen.getByTestId("book-roll");
    expect(roll).toHaveAttribute("data-direction", "forward");
    expect(roll.style.getPropertyValue("--roll-fade")).toBe("var(--color-primary)");
  });
});

describe("RollingStrip (partner logos)", () => {
  const strip = (items: RollItem[]) => <RollingStrip label="Our partners" kind="logo" direction="reverse" pauseOnHover={false} fadeColor="var(--color-home-partners-band)" items={items} />;

  it("runs the other way, fades into the section's own colour, and is a logo strip", () => {
    render(strip(logos(7)));
    const roll = screen.getByTestId("partner-roll");
    expect(roll).toHaveAttribute("data-kind", "logo");
    expect(roll).toHaveAttribute("data-direction", "reverse");
    expect(roll.style.getPropertyValue("--roll-fade")).toBe("var(--color-home-partners-band)");
    expect(roll).toHaveAttribute("data-mode", "loop");
  });

  it("does not pause when the pointer is over it, but does for focus", () => {
    render(strip(logos(7)));
    const roll = screen.getByTestId("partner-roll");
    fireEvent.pointerEnter(roll, { pointerType: "mouse" });
    expect(roll).toHaveAttribute("data-paused", "false");
    fireEvent.focus(roll);
    expect(roll).toHaveAttribute("data-paused", "true");
  });

  it("hears each logo once: copies are aria-hidden, with empty alt text, and each real logo keeps its alt", () => {
    render(strip(logos(7)));
    for (const logo of logos(7)) expect(screen.getAllByRole("img", { name: logo.alt })).toHaveLength(1);
    const copies = screen.getAllByTestId("partner-logo-copy");
    expect(copies.length).toBeGreaterThanOrEqual(7);
    for (const copy of copies) {
      expect(copy).toHaveAttribute("aria-hidden", "true");
      expect(copy.querySelector("img")).toHaveAttribute("alt", "");
    }
  });

  it("keeps links as links, named after the partner, and plain images plain; copies of a link are out of the tab order", () => {
    const { unmount } = render(strip([...logos(5, false)].map((l, i) => (i === 1 ? { ...l, href: "/partners/2" } : l))));
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1); // only the real linked logo is in the accessibility tree
    expect(links[0]).toHaveAttribute("href", "/partners/2");
    expect(links[0]).toHaveAccessibleName("Partner 2");
    const copyLinks = screen.getAllByTestId("partner-logo-copy").flatMap((li) => Array.from(li.querySelectorAll("a")));
    expect(copyLinks.length).toBeGreaterThan(0);
    for (const a of copyLinks) expect(a).toHaveAttribute("tabindex", "-1");
    // the others are not links
    expect(screen.getAllByTestId("partner-logo").filter((li) => li.querySelector("a"))).toHaveLength(1);
    unmount();
  });

  it("is a still, centred row with fewer than three logos", () => {
    render(strip(logos(2)));
    const roll = screen.getByTestId("partner-roll");
    expect(roll).toHaveAttribute("data-mode", "static");
    expect(screen.queryAllByTestId("partner-logo-copy")).toHaveLength(0);
    expect(roll.querySelectorAll(".roll-fade")).toHaveLength(0);
  });
});

describe("the strip's sizes match the CSS tokens", () => {
  const css = readFileSync(path.join(__dirname, "..", "..", "app", "globals.css"), "utf8");
  const px = (name: string) => Number(new RegExp(`--${name}:\\s*(\\d+)px`).exec(css)?.[1]);

  it("partner logo box, cap and gaps", () => {
    expect(px("spacing-home-partner-box-h")).toBe(ROLL_SIZES.logo.height);
    expect(px("spacing-home-partner-box-h-sm")).toBe(ROLL_SIZES.logo.heightSm);
    expect(px("spacing-home-partner-box-w")).toBe(ROLL_SIZES.logo.maxWidth);
    expect(px("spacing-home-partner-gap")).toBe(ROLL_SIZES.logo.gap);
    expect(px("spacing-home-partner-gap-sm")).toBe(ROLL_SIZES.logo.gapSm);
  });

  it("book cover height", () => {
    expect(px("spacing-home-book-height")).toBe(ROLL_SIZES.cover.height);
  });
});
