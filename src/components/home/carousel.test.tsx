import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Carousel } from "./carousel";

function setLayout({ scrollWidth, clientWidth, scrollLeft = 0 }: { scrollWidth: number; clientWidth: number; scrollLeft?: number }) {
  Object.defineProperty(HTMLElement.prototype, "scrollWidth", { configurable: true, get: () => scrollWidth });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => clientWidth });
  Object.defineProperty(HTMLElement.prototype, "scrollLeft", { configurable: true, get: () => scrollLeft, set: () => {} });
}

function reducedMotion(on: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: on && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
}

const scrollBy = vi.fn();
const scrollTo = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  reducedMotion(false);
  scrollBy.mockReset();
  scrollTo.mockReset();
  HTMLElement.prototype.scrollBy = scrollBy as unknown as HTMLElement["scrollBy"];
  HTMLElement.prototype.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];
});
afterEach(() => {
  vi.useRealTimers();
});

const items = (n: number) => Array.from({ length: n }, (_, i) => <span key={i}>Item {i + 1}</span>);

describe("Carousel", () => {
  it("labels the region and each item 'n of N'", () => {
    setLayout({ scrollWidth: 300, clientWidth: 300 });
    render(<Carousel label="Books" perViewClass="">{items(3)}</Carousel>);
    expect(screen.getByRole("region", { name: "Books" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "2 of 3" })).toHaveTextContent("Item 2");
  });

  it("hides the arrows when everything fits", () => {
    setLayout({ scrollWidth: 300, clientWidth: 300 });
    render(<Carousel label="Books" perViewClass="">{items(2)}</Carousel>);
    expect(screen.queryByRole("button", { name: /Next/ })).toBeNull();
  });

  it("next scrolls by one page and wraps to the start at the end", () => {
    setLayout({ scrollWidth: 1200, clientWidth: 300 });
    render(<Carousel label="Books" perViewClass="">{items(8)}</Carousel>);
    fireEvent.click(screen.getByRole("button", { name: "Next — Books" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: "smooth" });

    setLayout({ scrollWidth: 1200, clientWidth: 300, scrollLeft: 900 });
    fireEvent.click(screen.getByRole("button", { name: "Next — Books" }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 0, behavior: "smooth" });
  });

  it("autoplays, pauses while hovered or focused, and resumes", () => {
    setLayout({ scrollWidth: 1200, clientWidth: 300 });
    render(<Carousel label="Partners" perViewClass="" autoplayMs={5000}>{items(8)}</Carousel>);
    act(() => void vi.advanceTimersByTime(5000));
    expect(scrollBy).toHaveBeenCalledTimes(1);

    const region = screen.getByRole("region", { name: "Partners" });
    fireEvent.pointerEnter(region);
    act(() => void vi.advanceTimersByTime(15000));
    expect(scrollBy).toHaveBeenCalledTimes(1);

    fireEvent.pointerLeave(region);
    act(() => void vi.advanceTimersByTime(5000));
    expect(scrollBy).toHaveBeenCalledTimes(2);

    // Keyboard focus (:focus-visible) pauses it.
    const next = screen.getByRole("button", { name: "Next — Partners" });
    const matches = vi.spyOn(next, "matches").mockImplementation((selector: string) => selector === ":focus-visible");
    fireEvent.focus(next);
    act(() => void vi.advanceTimersByTime(15000));
    expect(scrollBy).toHaveBeenCalledTimes(2);
    matches.mockRestore();
  });

  it("a mouse click on an arrow does not stop autoplay for good", () => {
    setLayout({ scrollWidth: 1200, clientWidth: 300 });
    render(<Carousel label="Partners" perViewClass="" autoplayMs={5000}>{items(8)}</Carousel>);
    const next = screen.getByRole("button", { name: "Next — Partners" });
    vi.spyOn(next, "matches").mockReturnValue(false); // focused by a click, not the keyboard
    fireEvent.focus(next);
    act(() => void vi.advanceTimersByTime(5000));
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it("never autoplays for reduced motion, and arrows jump without smooth scrolling", () => {
    reducedMotion(true);
    setLayout({ scrollWidth: 1200, clientWidth: 300 });
    render(<Carousel label="Partners" perViewClass="" autoplayMs={5000}>{items(8)}</Carousel>);
    act(() => void vi.advanceTimersByTime(20000));
    expect(scrollBy).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Next — Partners" }));
    expect(scrollBy).toHaveBeenCalledWith({ left: 300, behavior: "auto" });
  });

  it("does not autoplay with a single item that fits", () => {
    setLayout({ scrollWidth: 300, clientWidth: 300 });
    render(<Carousel label="Partners" perViewClass="" autoplayMs={5000}>{items(1)}</Carousel>);
    act(() => void vi.advanceTimersByTime(20000));
    expect(scrollBy).not.toHaveBeenCalled();
  });
});
