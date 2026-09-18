import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { NavDesktop, isNavItemActive } from "./nav-desktop";
import type { NavigationItem } from "@/content/site-shell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
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

describe("isNavItemActive", () => {
  it("matches the home route only exactly", () => {
    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/about", "/")).toBe(false);
  });

  it("matches a route and its nested paths", () => {
    expect(isNavItemActive("/news", "/news")).toBe(true);
    expect(isNavItemActive("/news/some-slug", "/news")).toBe(true);
    expect(isNavItemActive("/newsletter", "/news")).toBe(false);
  });
});

describe("NavDesktop", () => {
  beforeEach(() => {
    vi.mocked(usePathname).mockReturnValue("/about");
  });

  it("marks the current page's item with aria-current", () => {
    render(<NavDesktop items={itemsWithDropdown} />);
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current"
    );
  });

  it("hides a dropdown until hovered or focused, exposing aria-expanded", async () => {
    render(<NavDesktop items={itemsWithDropdown} />);
    const aboutLink = screen.getByRole("link", { name: "About" });
    expect(aboutLink).toHaveAttribute("aria-haspopup", "true");
    expect(aboutLink).toHaveAttribute("aria-expanded", "false");
    // The dropdown is always mounted (toggled via CSS visibility, not
    // conditional rendering — see the comment on the dropdown <ul> in
    // nav-desktop.tsx) so a closed child link is present but untabbable.
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "tabindex",
      "-1"
    );

    fireEvent.mouseEnter(aboutLink.closest("li")!);
    expect(aboutLink).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "tabindex"
    );

    // Closing after mouseleave is debounced (CLOSE_DELAY_MS) so a pointer
    // briefly crossing a gap on its way into the dropdown doesn't close it
    // out from under a click — see the comment on CLOSE_DELAY_MS.
    fireEvent.mouseLeave(aboutLink.closest("li")!);
    expect(aboutLink).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(aboutLink).toHaveAttribute("aria-expanded", "false")
    );
  });

  it("keeps a dropdown link clickable through a brief mouseleave/mouseenter (regression: dropdown links must survive a real pointer's path from trigger to menu)", () => {
    render(<NavDesktop items={itemsWithDropdown} />);
    const aboutLink = screen.getByRole("link", { name: "About" });
    const li = aboutLink.closest("li")!;

    fireEvent.mouseEnter(li);
    // Simulate the pointer's path from the trigger into the dropdown
    // registering a fleeting mouseleave/mouseenter pair on the <li> before
    // settling on a child link (the exact sequence that made a dropdown
    // link unclickable in production).
    fireEvent.mouseLeave(li);
    fireEvent.mouseEnter(li);

    expect(aboutLink).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute(
      "tabindex"
    );
  });

  it("opens on keyboard focus and closes once focus leaves the item and its dropdown", () => {
    render(<NavDesktop items={itemsWithDropdown} />);
    const aboutLink = screen.getByRole("link", { name: "About" });

    fireEvent.focus(aboutLink);
    expect(aboutLink).toHaveAttribute("aria-expanded", "true");
    const overviewLink = screen.getByRole("link", { name: "Overview" });

    fireEvent.blur(aboutLink, { relatedTarget: overviewLink });
    expect(aboutLink).toHaveAttribute("aria-expanded", "true");

    fireEvent.blur(overviewLink, { relatedTarget: null });
    expect(aboutLink).toHaveAttribute("aria-expanded", "false");
  });

  it("renders no dropdown for an item with no children", () => {
    render(<NavDesktop items={itemsWithDropdown} />);
    const contactLink = screen.getByRole("link", { name: "Contact" });
    expect(contactLink).not.toHaveAttribute("aria-haspopup");
    expect(contactLink).not.toHaveAttribute("aria-expanded");
  });

  it("renders a very long label intact, without truncating it", () => {
    const longLabel =
      "A Very Long Menu Item Label That Keeps Going And Going And Going";
    render(<NavDesktop items={[{ label: longLabel, href: "/long" }]} />);
    const link = screen.getByRole("link", { name: longLabel });
    expect(link).toHaveTextContent(longLabel);
    expect(link.className).not.toMatch(/truncate/);
  });

  it("renders Urdu labels with dir=\"auto\" and the Urdu fallback font", () => {
    const urduLabel = "داخلہ";
    render(<NavDesktop items={[{ label: urduLabel, href: "/urdu" }]} />);
    const link = screen.getByRole("link", { name: urduLabel });
    const label = link.querySelector("span");
    expect(label).toHaveAttribute("dir", "auto");
    expect(label).toHaveClass("font-body-urdu");
  });

  it("does not apply the Urdu fallback font to non-Urdu labels", () => {
    render(<NavDesktop items={[{ label: "Admission", href: "/admission" }]} />);
    const link = screen.getByRole("link", { name: "Admission" });
    const label = link.querySelector("span");
    expect(label).not.toHaveClass("font-body-urdu");
  });
});
