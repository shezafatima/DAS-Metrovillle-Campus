// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.fn(async () => undefined);
const cookieGet = vi.fn<(name: string) => { value: string } | undefined>();
const getPublicSettings = vi.fn();
const freshReads = vi.fn(() => false);

vi.mock("next/server", () => ({ connection: () => connection() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => cookieGet(name) }) }));
vi.mock("@/lib/settings/public", () => ({ getPublicSettings: (...args: unknown[]) => getPublicSettings(...args) }));
vi.mock("@/lib/e2e-fresh-reads", () => ({ freshReadsForTests: () => freshReads() }));

const { getAdmissionWindow, isAdmissionApplyOpen, E2E_NOW_COOKIE } = await import("./server");

// 014b: the typed name is "not linked" to a Class Level, so it is still offered and the form can be open.
const SPRING = {
  opensOn: "2027-01-01",
  closesOn: "2027-03-31",
  announcement: "Admissions are open",
  closedMessage: "Opening soon",
  classes: [{ levelId: "", name: "Class 1" }],
};
const EMPTY = { opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes: [] };
const NO_LEVELS = { ageReferenceDate: "07-31", ageHeader: "31 July", levels: [] };

/** The admission group answers with `value`; Class Levels (read for the offered classes) has no rows. */
function useAdmission(value: unknown) {
  getPublicSettings.mockImplementation(async (group: string) => (group === "classLevels" ? NO_LEVELS : value));
}

beforeEach(() => {
  vi.useRealTimers();
  connection.mockClear();
  cookieGet.mockReset();
  getPublicSettings.mockReset();
  freshReads.mockReturnValue(false);
});

describe("getAdmissionWindow (020)", () => {
  it("renders per request and evaluates the saved dates at the current time", async () => {
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    useAdmission(SPRING);
    await expect(getAdmissionWindow()).resolves.toEqual({
      state: { kind: "open", closesOn: "2027-03-31" },
      announcement: "Admissions are open",
      closedMessage: "Opening soon",
    });
    expect(connection).toHaveBeenCalledTimes(1);
    expect(getPublicSettings).toHaveBeenCalledWith("admission");
  });

  it("ignores the e2e-now cookie outside the test server", async () => {
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    useAdmission(SPRING);
    cookieGet.mockReturnValue({ value: "2027-03-31T19:00:00Z" });
    expect((await getAdmissionWindow()).state.kind).toBe("open");
    expect(cookieGet).not.toHaveBeenCalled();
  });

  it("uses the e2e-now cookie on the test server", async () => {
    freshReads.mockReturnValue(true);
    useAdmission(SPRING);
    cookieGet.mockImplementation((name) => (name === E2E_NOW_COOKIE ? { value: "2027-03-31T18:59:59Z" } : undefined));
    expect((await getAdmissionWindow()).state.kind).toBe("open");
    cookieGet.mockImplementation((name) => (name === E2E_NOW_COOKIE ? { value: "2027-03-31T19:00:00Z" } : undefined));
    expect((await getAdmissionWindow()).state.kind).toBe("closed");
  });

  it("falls back to the real time for an unreadable cookie", async () => {
    freshReads.mockReturnValue(true);
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    useAdmission(SPRING);
    cookieGet.mockReturnValue({ value: "not a date" });
    expect((await getAdmissionWindow()).state.kind).toBe("open");
  });

  it("is closed with the starting values (what a failed Settings read falls back to)", async () => {
    useAdmission(EMPTY);
    expect((await getAdmissionWindow()).state).toEqual({ kind: "closed" });
  });
});

describe("isAdmissionApplyOpen (020 FR-018, 013 FR-020)", () => {
  it("is true only while the window is open and at least one class is listed", async () => {
    useAdmission(SPRING);
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    await expect(isAdmissionApplyOpen()).resolves.toBe(true);
    vi.setSystemTime(new Date("2026-12-01T06:00:00Z")); // upcoming
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
    vi.setSystemTime(new Date("2027-04-02T06:00:00Z")); // after the end
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
    useAdmission(EMPTY);
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
  });

  it("is false for an open window with no classes", async () => {
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    useAdmission({ ...SPRING, classes: [] });
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
  });
});
