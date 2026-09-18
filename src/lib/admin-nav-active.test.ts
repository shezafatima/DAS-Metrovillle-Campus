import { describe, expect, it } from "vitest";
import { isAdminNavItemActive } from "./admin-nav-active";

describe("isAdminNavItemActive", () => {
  it("matches /admin only exactly, not its sub-paths", () => {
    expect(isAdminNavItemActive("/admin", "/admin")).toBe(true);
    expect(isAdminNavItemActive("/admin/news", "/admin")).toBe(false);
    expect(isAdminNavItemActive("/admin/news/123", "/admin")).toBe(false);
  });

  it("matches a section and its nested paths", () => {
    expect(isAdminNavItemActive("/admin/news", "/admin/news")).toBe(true);
    expect(isAdminNavItemActive("/admin/news/123", "/admin/news")).toBe(true);
    expect(isAdminNavItemActive("/admin/messages", "/admin/news")).toBe(false);
  });
});
