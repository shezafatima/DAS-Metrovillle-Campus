import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "./admin-sidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

describe("AdminSidebar", () => {
  it("renders exactly the five sections in the fixed order", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    render(<AdminSidebar />);
    const links = screen.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      "Overview",
      "News",
      "Messages",
      "Signups",
      "Settings",
    ]);
  });

  it("marks News active (and nothing else) for a nested news path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/news/123");
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: "News" })).toHaveAttribute("aria-current", "page");
    for (const label of ["Overview", "Messages", "Signups", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("marks only Overview active at the root /admin path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    render(<AdminSidebar />);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    for (const label of ["News", "Messages", "Signups", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });
});
