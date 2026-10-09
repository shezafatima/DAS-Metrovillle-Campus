import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatCounter } from "./stat-counter";

describe("StatCounter (006 FR-021)", () => {
  it("shows the final number at once for reduced motion", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as typeof window.matchMedia;
    render(<StatCounter value={310000} />);
    expect(screen.getByTestId("stat-value")).toHaveTextContent("310000");
  });

  it("starts from zero and waits to be seen when motion is allowed", () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }) as unknown as typeof window.matchMedia;
    const observe = vi.fn();
    window.IntersectionObserver = vi.fn().mockImplementation(function () {
      return { observe, disconnect: vi.fn(), unobserve: vi.fn(), takeRecords: () => [] };
    }) as unknown as typeof IntersectionObserver;
    render(<StatCounter value={50} />);
    expect(screen.getByTestId("stat-value")).toHaveTextContent("0");
    expect(observe).toHaveBeenCalledTimes(1);
  });
});
