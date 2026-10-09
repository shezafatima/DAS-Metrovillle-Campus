import { describe, expect, it } from "vitest";
import {
  PERMISSION_KEYS,
  canAccess,
  isPermission,
  normalizePermissions,
  type Access,
} from "@/lib/permissions";

const ALL_ACCESS: Access[] = [...PERMISSION_KEYS, "main_admin", "any"];

describe("canAccess", () => {
  it("lets a main admin use every access, whatever grants are stored", () => {
    for (const access of ALL_ACCESS) {
      expect(canAccess({ role: "main_admin", permissions: [] }, access)).toBe(true);
    }
  });

  it("lets a content manager use only 'any' and their granted keys", () => {
    const user = { role: "content_manager" as const, permissions: ["news"] };
    expect(canAccess(user, "any")).toBe(true);
    expect(canAccess(user, "news")).toBe(true);
    expect(canAccess(user, "messages")).toBe(false);
    expect(canAccess(user, "careers")).toBe(false);
    expect(canAccess(user, "settings")).toBe(false);
    expect(canAccess(user, "pages")).toBe(false);
  });

  it("never lets a content manager reach main_admin, even holding every grant", () => {
    const user = { role: "content_manager" as const, permissions: [...PERMISSION_KEYS] };
    expect(canAccess(user, "main_admin")).toBe(false);
  });

  it("treats a content manager with no grants as overview/account only", () => {
    const user = { role: "content_manager" as const, permissions: [] };
    for (const access of ALL_ACCESS) {
      expect(canAccess(user, access)).toBe(access === "any");
    }
  });

  it("ignores a stored 'main_admin' string in permissions", () => {
    const user = { role: "content_manager" as const, permissions: ["main_admin", "users", "registrations"] };
    expect(canAccess(user, "main_admin")).toBe(false);
  });
});

describe("normalizePermissions", () => {
  it("drops main_admin, users, registrations and unknown keys", () => {
    expect(normalizePermissions(["news", "main_admin", "users", "registrations", "bogus"])).toEqual(["news"]);
  });

  it("removes duplicates and orders by the registry", () => {
    expect(normalizePermissions(["settings", "news", "news", "messages"])).toEqual(["news", "messages", "settings"]);
  });

  it("returns [] for non-arrays", () => {
    expect(normalizePermissions(undefined)).toEqual([]);
    expect(normalizePermissions("news")).toEqual([]);
    expect(normalizePermissions(null)).toEqual([]);
  });
});

describe("isPermission", () => {
  it("accepts exactly the five grantable keys", () => {
    for (const key of PERMISSION_KEYS) expect(isPermission(key)).toBe(true);
    expect(isPermission("users")).toBe(false);
    expect(isPermission("main_admin")).toBe(false);
    expect(isPermission(1)).toBe(false);
  });
});
