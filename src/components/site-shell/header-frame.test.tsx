import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { HeaderFrame } from "./header-frame";

vi.mock("next/navigation", () => ({ usePathname: vi.fn() }));

describe("HeaderFrame", () => {
  it("is a sticky, fixed-height header that is white and never transparent", () => {
    vi.mocked(usePathname).mockReturnValue("/");
    render(<HeaderFrame>nav</HeaderFrame>);
    const header = screen.getByRole("banner");
    expect(header.className).toContain("sticky");
    expect(header.className).toContain("h-(--header-h)");
    expect(header.className).toContain("bg-surface");
    expect(header.className).not.toContain("bg-transparent");
    expect(header).not.toHaveAttribute("data-transparent");
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
