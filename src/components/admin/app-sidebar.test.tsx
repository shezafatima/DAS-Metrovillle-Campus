import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { NotificationsProvider } from "@/components/admin/notifications/notifications-provider";
import { adminNavItems, visibleNavItems } from "@/content/admin";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

const ALL_HREFS = adminNavItems.map((item) => item.href);
const MAIN_ADMIN_HREFS = visibleNavItems({ role: "main_admin", permissions: [] }).map((item) => item.href);

function renderSidebar(initialMessagesNew = 0, initialSignupsNew = 0, allowedHrefs: readonly string[] = MAIN_ADMIN_HREFS) {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // never resolves — keeps the seeded values stable
  return render(
    <NotificationsProvider initialMessagesNew={initialMessagesNew} initialSignupsNew={initialSignupsNew}>
      <SidebarProvider>
        <AppSidebar allowedHrefs={allowedHrefs} />
      </SidebarProvider>
    </NotificationsProvider>,
  );
}

function menuLabels() {
  return screen
    .getAllByRole("link")
    .filter((el) => el.getAttribute("data-slot") === "sidebar-menu-button")
    .map((l) => l.textContent);
}

describe("AppSidebar", () => {
  it("renders the five sections in the fixed order, then Users, for a main admin", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar();
    expect(menuLabels()).toEqual(["Overview", "News", "Messages", "Signups", "Settings", "Users"]);
    expect(ALL_HREFS).toEqual(MAIN_ADMIN_HREFS);
  });

  it("renders only the allowed sections, keeping the fixed order (011)", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    const hrefs = visibleNavItems({ role: "content_manager", permissions: ["settings", "news"] }).map((i) => i.href);
    renderSidebar(0, 0, hrefs);
    expect(menuLabels()).toEqual(["Overview", "News", "Settings"]);
  });

  it("never offers Users to a content manager, even holding every grant", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    const hrefs = visibleNavItems({
      role: "content_manager",
      permissions: ["news", "messages", "careers", "settings", "pages"],
    }).map((i) => i.href);
    renderSidebar(0, 0, hrefs);
    expect(menuLabels()).not.toContain("Users");
  });

  it("shows only Overview to a content manager with no grants", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar(0, 0, visibleNavItems({ role: "content_manager", permissions: [] }).map((i) => i.href));
    expect(menuLabels()).toEqual(["Overview"]);
  });

  it("shows no badge for a section that is not rendered", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar(5, 4, ["/admin", "/admin/news"]);
    expect(screen.queryByText("5")).toBeNull();
    expect(screen.queryByText("4")).toBeNull();
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

  it("shows a badge with the count on Messages when new messages exist, and none at 0", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    const { rerender } = renderSidebar(3, 0);
    expect(screen.getByText("3")).toBeInTheDocument();

    rerender(
      <NotificationsProvider initialMessagesNew={0} initialSignupsNew={0}>
        <SidebarProvider>
          <AppSidebar allowedHrefs={MAIN_ADMIN_HREFS} />
        </SidebarProvider>
      </NotificationsProvider>,
    );
    expect(screen.queryByText("0")).toBeNull();
  });

  it("shows a badge with the count on Signups when new signups exist, and none at 0", () => {
    vi.mocked(usePathname).mockReturnValue("/admin");
    renderSidebar(0, 2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
