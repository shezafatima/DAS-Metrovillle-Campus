// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { registrationOpen } from "./availability";
import { admissionWindowState, karachiToday } from "@/lib/admission/window";

vi.mock("server-only", () => ({}));

const SPRING = { opensOn: "2027-01-01", closesOn: "2027-03-31" };
const at = (iso: string) => new Date(iso);

describe("registrationOpen (013 research §2)", () => {
  it("is open for an open window with at least one class", () => {
    expect(registrationOpen({ kind: "open", closesOn: "2027-03-31" }, ["Class 1"])).toBe(true);
  });

  it("is closed for an open window with no classes", () => {
    expect(registrationOpen({ kind: "open", closesOn: "2027-03-31" }, [])).toBe(false);
  });

  it("is closed for an upcoming or closed window, however many classes", () => {
    expect(registrationOpen({ kind: "upcoming", opensOn: "2027-01-01" }, ["Class 1"])).toBe(false);
    expect(registrationOpen({ kind: "closed" }, ["Class 1"])).toBe(false);
  });
});

describe("registrationOpen at the Pakistan boundaries, whatever the process time zone", () => {
  const originalTz = process.env.TZ;
  afterEach(() => {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  });

  const answers = () =>
    [
      "2026-12-31T18:59:59Z", // 23:59:59 PKT the day before Opens on
      "2026-12-31T19:00:00Z", // 00:00:00 PKT on Opens on
      "2027-03-31T18:59:59Z", // 23:59:59 PKT on Closes on
      "2027-03-31T19:00:00Z", // 00:00:00 PKT the day after
    ].map((iso) => [registrationOpen(admissionWindowState(SPRING, at(iso)), ["Class 1"]), karachiToday(at(iso))]);

  it("gives the same answers in America/New_York and Asia/Karachi", () => {
    process.env.TZ = "America/New_York";
    const newYork = answers();
    process.env.TZ = "Asia/Karachi";
    const karachi = answers();
    expect(newYork).toEqual(karachi);
    expect(karachi.map(([open]) => open)).toEqual([false, true, true, false]);
  });
});
