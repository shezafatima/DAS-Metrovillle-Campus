import { describe, expect, it } from "vitest";
import { safeAdminReturnPath } from "./return-path";

describe("safeAdminReturnPath", () => {
  it("keeps a plain admin sub-path", () => {
    expect(safeAdminReturnPath("/admin/news")).toBe("/admin/news");
  });

  it("falls back to /admin for undefined", () => {
    expect(safeAdminReturnPath(undefined)).toBe("/admin");
  });

  it("falls back to /admin for the root path", () => {
    expect(safeAdminReturnPath("/")).toBe("/admin");
  });

  it("falls back to /admin for the login page itself", () => {
    expect(safeAdminReturnPath("/admin/login")).toBe("/admin");
  });

  it("falls back to /admin for a protocol-relative URL", () => {
    expect(safeAdminReturnPath("//evil.com")).toBe("/admin");
  });

  it("falls back to /admin for an absolute URL with a scheme", () => {
    expect(safeAdminReturnPath("https://evil.com")).toBe("/admin");
  });

  it("falls back to /admin for a path containing a backslash", () => {
    expect(safeAdminReturnPath("/admin/..\\x")).toBe("/admin");
  });

  it("falls back to /admin for a lookalike path outside /admin/", () => {
    expect(safeAdminReturnPath("/adminx")).toBe("/admin");
  });
});
