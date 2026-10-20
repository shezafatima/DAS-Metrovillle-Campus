// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const connection = vi.fn(async () => undefined);
const cookieGet = vi.fn<(name: string) => { value: string } | undefined>();
const getPublicSettings = vi.fn();
const freshReads = vi.fn(() => false);
const flag = { registrationFormExists: false };

vi.mock("next/server", () => ({ connection: () => connection() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => cookieGet(name) }) }));
vi.mock("@/lib/settings/public", () => ({ getPublicSettings: (...args: unknown[]) => getPublicSettings(...args) }));
vi.mock("@/lib/e2e-fresh-reads", () => ({ freshReadsForTests: () => freshReads() }));
vi.mock("@/content/admission/registration", () => ({
  get registrationFormExists() {
    return flag.registrationFormExists;
  },
}));

const { getAdmissionWindow, isAdmissionApplyOpen, E2E_NOW_COOKIE } = await import("./server");

const SPRING = { opensOn: "2027-01-01", closesOn: "2027-03-31", announcement: "Admissions are open", closedMessage: "Opening soon" };
const EMPTY = { opensOn: "", closesOn: "", announcement: "", closedMessage: "" };

beforeEach(() => {
  vi.useRealTimers();
  connection.mockClear();
  cookieGet.mockReset();
  getPublicSettings.mockReset();
  freshReads.mockReturnValue(false);
  flag.registrationFormExists = false;
});

describe("getAdmissionWindow (020)", () => {
  it("renders per request and evaluates the saved dates at the current time", async () => {
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    getPublicSettings.mockResolvedValue(SPRING);
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
    getPublicSettings.mockResolvedValue(SPRING);
    cookieGet.mockReturnValue({ value: "2027-03-31T19:00:00Z" });
    expect((await getAdmissionWindow()).state.kind).toBe("open");
    expect(cookieGet).not.toHaveBeenCalled();
  });

  it("uses the e2e-now cookie on the test server", async () => {
    freshReads.mockReturnValue(true);
    getPublicSettings.mockResolvedValue(SPRING);
    cookieGet.mockImplementation((name) => (name === E2E_NOW_COOKIE ? { value: "2027-03-31T18:59:59Z" } : undefined));
    expect((await getAdmissionWindow()).state.kind).toBe("open");
    cookieGet.mockImplementation((name) => (name === E2E_NOW_COOKIE ? { value: "2027-03-31T19:00:00Z" } : undefined));
    expect((await getAdmissionWindow()).state.kind).toBe("closed");
  });

  it("falls back to the real time for an unreadable cookie", async () => {
    freshReads.mockReturnValue(true);
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    getPublicSettings.mockResolvedValue(SPRING);
    cookieGet.mockReturnValue({ value: "not a date" });
    expect((await getAdmissionWindow()).state.kind).toBe("open");
  });

  it("is closed with the starting values (what a failed Settings read falls back to)", async () => {
    getPublicSettings.mockResolvedValue(EMPTY);
    expect((await getAdmissionWindow()).state).toEqual({ kind: "closed" });
  });
});

describe("isAdmissionApplyOpen (020 FR-018)", () => {
  it("is false while the registration form does not exist, even with the window open", async () => {
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    getPublicSettings.mockResolvedValue(SPRING);
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
  });

  it("with the form, is true only while the window is open", async () => {
    flag.registrationFormExists = true;
    getPublicSettings.mockResolvedValue(SPRING);
    vi.useFakeTimers({ now: new Date("2027-02-01T06:00:00Z"), toFake: ["Date"] });
    await expect(isAdmissionApplyOpen()).resolves.toBe(true);
    vi.setSystemTime(new Date("2026-12-01T06:00:00Z")); // upcoming
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
    vi.setSystemTime(new Date("2027-04-02T06:00:00Z")); // after the end
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
    getPublicSettings.mockResolvedValue(EMPTY);
    await expect(isAdmissionApplyOpen()).resolves.toBe(false);
  });
});
