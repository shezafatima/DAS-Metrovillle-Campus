// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { admissionStatusText, admissionWindowState, formatAdmissionDate, karachiToday } from "./window";

const at = (iso: string) => new Date(iso);
const dates = (opensOn: string, closesOn: string) => ({ opensOn, closesOn });
const SPRING = dates("2027-01-01", "2027-03-31");

describe("karachiToday (020 FR-011)", () => {
  it("is the calendar day in Asia/Karachi (UTC+5), not UTC", () => {
    expect(karachiToday(at("2026-12-31T18:59:59Z"))).toBe("2026-12-31");
    expect(karachiToday(at("2026-12-31T19:00:00Z"))).toBe("2027-01-01");
    expect(karachiToday(at("2027-03-31T23:30:00Z"))).toBe("2027-04-01");
  });
});

describe("admissionWindowState (020 contracts/admission-window.md)", () => {
  it("is closed while either date is empty", () => {
    expect(admissionWindowState(dates("", ""), at("2027-02-01T06:00:00Z"))).toEqual({ kind: "closed" });
    expect(admissionWindowState(dates("", "2027-03-31"), at("2027-02-01T06:00:00Z"))).toEqual({ kind: "closed" });
    expect(admissionWindowState(dates("2027-01-01", ""), at("2027-02-01T06:00:00Z"))).toEqual({ kind: "closed" });
  });

  it("is upcoming until 23:59:59 Karachi on the day before Opens on", () => {
    expect(admissionWindowState(SPRING, at("2026-12-31T18:59:59Z"))).toEqual({ kind: "upcoming", opensOn: "2027-01-01" });
  });

  it("opens at 00:00:00 Karachi on Opens on", () => {
    expect(admissionWindowState(SPRING, at("2026-12-31T19:00:00Z"))).toEqual({ kind: "open", closesOn: "2027-03-31" });
  });

  it("stays open until 23:59:59 Karachi on Closes on", () => {
    expect(admissionWindowState(SPRING, at("2027-03-31T18:59:59Z"))).toEqual({ kind: "open", closesOn: "2027-03-31" });
  });

  it("closes at 00:00:00 Karachi the day after Closes on", () => {
    expect(admissionWindowState(SPRING, at("2027-03-31T19:00:00Z"))).toEqual({ kind: "closed" });
  });

  it("is open all day for a one-day window", () => {
    const day = dates("2027-01-15", "2027-01-15");
    expect(admissionWindowState(day, at("2027-01-14T19:00:00Z")).kind).toBe("open");
    expect(admissionWindowState(day, at("2027-01-15T06:00:00Z")).kind).toBe("open");
    expect(admissionWindowState(day, at("2027-01-15T19:00:00Z")).kind).toBe("closed");
  });

  it("treats a malformed or impossible stored date as empty", () => {
    expect(admissionWindowState(dates("2027-02-30", "2027-03-31"), at("2027-03-01T06:00:00Z"))).toEqual({ kind: "closed" });
    expect(admissionWindowState(dates("soon", "2027-03-31"), at("2027-03-01T06:00:00Z"))).toEqual({ kind: "closed" });
  });

  it("is closed when the stored end is before the start", () => {
    expect(admissionWindowState(dates("2027-03-31", "2027-01-01"), at("2027-02-01T06:00:00Z"))).toEqual({ kind: "closed" });
  });
});

describe("independent of the process time zone", () => {
  const original = process.env.TZ;
  afterEach(() => {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  });

  it("gives the same answers in New York and in Karachi", () => {
    const instants = ["2026-12-31T18:59:59Z", "2026-12-31T19:00:00Z", "2027-03-31T18:59:59Z", "2027-03-31T19:00:00Z"];
    const run = () => instants.map((iso) => [karachiToday(at(iso)), admissionWindowState(SPRING, at(iso)).kind, formatAdmissionDate("2027-03-31")]);
    process.env.TZ = "America/New_York";
    const newYork = run();
    process.env.TZ = "Asia/Karachi";
    const karachi = run();
    expect(newYork).toEqual(karachi);
  });
});

describe("formatAdmissionDate", () => {
  it("writes the day, the month in full and the year", () => {
    expect(formatAdmissionDate("2027-03-31")).toBe("31 March 2027");
    expect(formatAdmissionDate("2027-01-01")).toBe("1 January 2027");
  });
});

describe("admissionStatusText (020 FR-012)", () => {
  it("states the window in words", () => {
    expect(admissionStatusText({ kind: "open", closesOn: "2027-03-31" })).toBe("Open now until 31 March 2027");
    expect(admissionStatusText({ kind: "upcoming", opensOn: "2027-01-01" })).toBe("Opens on 1 January 2027");
    expect(admissionStatusText({ kind: "closed" })).toBe("Closed");
  });
});
