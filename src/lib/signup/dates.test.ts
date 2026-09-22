import { describe, expect, it } from "vitest";
import { csvDateStamp, formatSignupDateTime } from "./dates";

describe("formatSignupDateTime", () => {
  it("renders a fixed UTC instant in Pakistan Standard Time (+05:00)", () => {
    // 2026-09-22T09:05:00Z + 5h = 2026-09-22 14:05 PKT
    expect(formatSignupDateTime(new Date("2026-09-22T09:05:00Z"))).toBe("22 Sep 2026, 14:05");
  });

  it("rolls over to the next PKT day near midnight UTC", () => {
    // 2026-09-22T20:30:00Z + 5h = 2026-09-23 01:30 PKT
    expect(formatSignupDateTime(new Date("2026-09-22T20:30:00Z"))).toBe("23 Sep 2026, 01:30");
  });
});

describe("csvDateStamp", () => {
  it("formats as YYYY-MM-DD in PKT", () => {
    expect(csvDateStamp(new Date("2026-09-22T09:05:00Z"))).toBe("2026-09-22");
    expect(csvDateStamp(new Date("2026-09-22T20:30:00Z"))).toBe("2026-09-23");
  });
});
