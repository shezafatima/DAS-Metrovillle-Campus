import { describe, expect, it } from "vitest";
import { formatPostDate, startOfTodayPkt, toDateInput, toUtcMidnight } from "./dates";

describe("toUtcMidnight / toDateInput", () => {
  it("round-trips a date input", () => {
    expect(toDateInput(toUtcMidnight("2026-02-06"))).toBe("2026-02-06");
  });

  it("throws on a malformed input", () => {
    expect(() => toUtcMidnight("2026/02/06")).toThrow();
  });
});

describe("startOfTodayPkt", () => {
  it("rolls over to the next UTC day once PKT (UTC+5) has crossed midnight", () => {
    // 2026-09-21T19:30:00Z = 2026-09-22T00:30 PKT
    const now = new Date("2026-09-21T19:30:00Z");
    expect(toDateInput(startOfTodayPkt(now))).toBe("2026-09-22");
  });

  it("stays on the same UTC day before PKT midnight", () => {
    // 2026-09-21T10:00:00Z = 2026-09-21T15:00 PKT
    const now = new Date("2026-09-21T10:00:00Z");
    expect(toDateInput(startOfTodayPkt(now))).toBe("2026-09-21");
  });
});

describe("formatPostDate", () => {
  const cases: Array<[string, string]> = [
    ["2023-02-06", "February 6th, 2023"],
    ["2026-01-01", "January 1st, 2026"],
    ["2026-01-02", "January 2nd, 2026"],
    ["2026-01-03", "January 3rd, 2026"],
    ["2026-01-04", "January 4th, 2026"],
    ["2026-01-11", "January 11th, 2026"],
    ["2026-01-12", "January 12th, 2026"],
    ["2026-01-13", "January 13th, 2026"],
    ["2026-01-21", "January 21st, 2026"],
    ["2026-01-22", "January 22nd, 2026"],
    ["2026-01-23", "January 23rd, 2026"],
    ["2026-01-31", "January 31st, 2026"],
  ];

  for (const [input, expected] of cases) {
    it(`formats ${input} as "${expected}"`, () => {
      expect(formatPostDate(toUtcMidnight(input))).toBe(expected);
    });
  }
});
