import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { NavMobile } from "./nav-mobile";
import type { NavigationItem } from "@/content/site-shell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
}));

const itemsWithDropdown: NavigationItem[] = [
  { label: "Home", href: "/" },
  {
    label: "About",
    href: "/about",
    children: [
      { label: "Overview", href: "/about/overview" },
      { label: "Management", href: "/about/management" },
    ],
  },
  { label: "Contact", href: "/contact" },
];

describe("NavMobile", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/");
  });

  it("lists all top-level items once opened", async () => {
    render(<NavMobile items={itemsWithDropdown} />);
    expect(screen.queryByRole("link", { name: "Home" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    expect(await screen.findByRole("link", { name: "Home" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Contact" })).toBeInTheDocument();
  });

  it("expands and collapses an item's sub-pages in place", async () => {
    render(<NavMobile items={itemsWithDropdown} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const aboutTrigger = await screen.findByRole("button", { name: "About" });
    expect(
      screen.queryByRole("link", { name: "Overview" })
    ).not.toBeInTheDocument();

    fireEvent.click(aboutTrigger);
    expect(await screen.findByRole("link", { name: "Overview" })).toBeVisible();

    fireEvent.click(aboutTrigger);
    expect(
      screen.queryByRole("link", { name: "Overview" })
    ).not.toBeInTheDocument();
  });

  it("renders a very long label intact, without truncating it", async () => {
    const longLabel =
      "A Very Long Menu Item Label That Keeps Going And Going And Going";
    render(<NavMobile items={[{ label: longLabel, href: "/long" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const link = await screen.findByRole("link", { name: longLabel });
    expect(link).toHaveTextContent(longLabel);
    expect(link.className).not.toMatch(/truncate/);
  });

  it("renders Urdu labels with dir=\"auto\" and the Urdu fallback font", async () => {
    const urduLabel = "داخلہ";
    render(<NavMobile items={[{ label: urduLabel, href: "/urdu" }]} />);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    const link = await screen.findByRole("link", { name: urduLabel });
    const label = link.querySelector("span");
    expect(label).toHaveAttribute("dir", "auto");
    expect(label).toHaveClass("font-body-urdu");
  });
});
