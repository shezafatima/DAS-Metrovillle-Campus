import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { HeaderFrame, SOLID_AFTER } from "./header-frame";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

function scrollTo(y: number) {
  act(() => {
    Object.defineProperty(window, "scrollY", { value: y, configurable: true });
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("HeaderFrame", () => {
  beforeEach(() => {
    scrollTo(0);
  });

  it("is transparent at the top of the home page and solid once scrolled", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<HeaderFrame>nav</HeaderFrame>);
    const header = screen.getByRole("banner");
    expect(header).toHaveAttribute("data-transparent", "true");

    scrollTo(SOLID_AFTER + 1);
    expect(header).toHaveAttribute("data-transparent", "false");

    scrollTo(0);
    expect(header).toHaveAttribute("data-transparent", "true");
  });

  it("is solid from the top on every other page", () => {
    vi.mocked(usePathname).mockReturnValue("/news");
    render(<HeaderFrame>nav</HeaderFrame>);
    expect(screen.getByRole("banner")).toHaveAttribute("data-transparent", "false");
  });

  it("sits over the hero only on the home page", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    const { unmount } = render(<HeaderFrame>nav</HeaderFrame>);
    expect(screen.getByRole("banner").className).toContain("-mb-(--header-h)");
    unmount();

    vi.mocked(usePathname).mockReturnValue("/contact");
    render(<HeaderFrame>nav</HeaderFrame>);
    expect(screen.getByRole("banner").className).not.toContain("-mb-(--header-h)");
  });
});
