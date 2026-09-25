import { describe, expect, it } from "vitest";
import { formatAdminDateTime } from "@/lib/admin-datetime";

describe("formatAdminDateTime", () => {
  it("formats an instant in Pakistan Standard Time", () => {
    expect(formatAdminDateTime(new Date("2026-09-24T09:05:00Z"))).toBe("24 Sep 2026, 14:05");
  });
});
