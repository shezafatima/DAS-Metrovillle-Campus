import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

function renderSidebar(newMessagesCount?: number) {
  return render(
    <SidebarProvider>
      <AppSidebar newMessagesCount={newMessagesCount} />
    </SidebarProvider>,
  );
}

describe("AppSidebar", () => {
  it("renders exactly the five sections in the fixed order", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar();
    const links = screen.getAllByRole("link").filter((el) => el.getAttribute("data-slot") === "sidebar-menu-button");
    expect(links.map((l) => l.textContent)).toEqual(["Overview", "News", "Messages", "Signups", "Settings"]);
  });

  it("marks News active (and nothing else) for a nested news path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/news/123");
    renderSidebar();
    expect(screen.getByRole("link", { name: "News" })).toHaveAttribute("aria-current", "page");
    for (const label of ["Overview", "Messages", "Signups", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("marks only Overview active at the root /admin path", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar();
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    for (const label of ["News", "Messages", "Signups", "Settings"]) {
      expect(screen.getByRole("link", { name: label })).not.toHaveAttribute("aria-current");
    }
  });

  it("shows a badge with the count on Messages when newMessagesCount is set, and none at 0", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    const { rerender } = renderSidebar(3);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <SidebarProvider>
        <AppSidebar newMessagesCount={0} />
      </SidebarProvider>,
    );
    expect(screen.queryByText("0")).toBeNull();
  });
});
