import { describe, expect, it } from "vitest";
import { inboxHref } from "@/lib/messages/inbox-href";

describe("inboxHref", () => {
  it("returns the bare inbox path for undefined", () => {
    expect(inboxHref(undefined)).toBe("/admin/messages");
  });

  it("round-trips valid params", () => {
    expect(inboxHref("q=ali&status=read&page=2")).toBe("/admin/messages?q=ali&status=read&page=2");
  });

  it("drops an unknown status, a non-positive page and an unlisted key", () => {
    expect(inboxHref("status=bogus&page=0&evil=1")).toBe("/admin/messages");
  });

  it("drops an absolute URL", () => {
    expect(inboxHref("https://evil.example")).toBe("/admin/messages");
  });

  it("drops a javascript: URL", () => {
    expect(inboxHref("javascript:alert(1)")).toBe("/admin/messages");
  });

  it("always starts with /admin/messages", () => {
    for (const input of [undefined, "q=x", "status=new", "page=5", "garbage!!!"]) {
      expect(inboxHref(input)).toMatch(/^\/admin\/messages/);
    }
  });
});
