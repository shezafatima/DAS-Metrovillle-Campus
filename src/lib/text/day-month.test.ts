import { describe, expect, it } from "vitest";
import { MONTH_NAMES, formatDayMonth, isDayMonth, joinDayMonth, splitDayMonth } from "./day-month";

describe("isDayMonth", () => {
  it.each(["07-31", "02-29", "12-01", "01-01", "04-30", "12-31"])("accepts %s", (value) => {
    expect(isDayMonth(value)).toBe(true);
  });

  it.each(["04-31", "02-30", "13-01", "00-10", "01-00", "7-31", "07-3", "", "07/31", "2026-07-31", " 07-31", "ab-cd"])("refuses %j", (value) => {
    expect(isDayMonth(value)).toBe(false);
  });
});

describe("formatDayMonth", () => {
  it("writes the day and the English month name", () => {
    expect(formatDayMonth("07-31")).toBe("31 July");
    expect(formatDayMonth("04-01")).toBe("1 April");
    expect(formatDayMonth("02-29")).toBe("29 February");
    expect(formatDayMonth("12-25")).toBe("25 December");
  });

  it("knows all twelve months", () => {
    expect(MONTH_NAMES).toHaveLength(12);
    expect(MONTH_NAMES.map((_, i) => formatDayMonth(`${String(i + 1).padStart(2, "0")}-15`))).toEqual(MONTH_NAMES.map((name) => `15 ${name}`));
  });

  it("returns something that is not a valid day-month unchanged", () => {
    expect(formatDayMonth("")).toBe("");
    expect(formatDayMonth("04-31")).toBe("04-31");
  });
});

describe("splitDayMonth and joinDayMonth", () => {
  it("round-trips", () => {
    expect(splitDayMonth("07-31")).toEqual({ month: "07", day: "31" });
    expect(joinDayMonth("07", "31")).toBe("07-31");
    expect(joinDayMonth(4, 1)).toBe("04-01");
  });

  it("a half-chosen date keeps the part that was chosen, so the selects need no state of their own", () => {
    expect(joinDayMonth("07", "")).toBe("07-");
    expect(joinDayMonth("", "31")).toBe("-31");
    expect(splitDayMonth("07-")).toEqual({ month: "07", day: "" });
    expect(splitDayMonth("-31")).toEqual({ month: "", day: "31" });
    expect(isDayMonth("07-")).toBe(false);
    expect(isDayMonth("-31")).toBe(false);
  });

  it("nothing chosen is empty, and a value that is not shaped like a day-month splits into empty parts", () => {
    expect(joinDayMonth("", "")).toBe("");
    expect(splitDayMonth("")).toEqual({ month: "", day: "" });
    expect(splitDayMonth("July 31")).toEqual({ month: "", day: "" });
    expect(splitDayMonth("2026-07-31")).toEqual({ month: "", day: "" });
  });

  it("an impossible combination splits as typed; isDayMonth is what says it is not a date", () => {
    expect(splitDayMonth("04-31")).toEqual({ month: "04", day: "31" });
    expect(isDayMonth("04-31")).toBe(false);
  });
});
