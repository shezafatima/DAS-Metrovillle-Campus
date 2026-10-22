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

// ── 014b: the class list comes from the ticked Class Levels ───────────────

const state = vi.hoisted(() => ({
  admission: { opensOn: "2027-01-01", closesOn: "2027-03-31", announcement: "", closedMessage: "", classes: [] as { levelId: string; name: string }[] },
  classLevels: { ageReferenceDate: "07-31", ageHeader: "31 July", levels: [] as { id: string; name: string; ageRule: string }[] },
  now: new Date("2027-02-01T05:00:00Z"),
}));

vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("@/lib/settings/public", () => ({
  getPublicSettings: async (group: string) => (group === "admission" ? state.admission : state.classLevels),
}));
vi.mock("@/lib/admission/server", () => ({ currentTime: async () => state.now }));

describe("getRegistrationAvailability: classes (014b)", () => {
  const levels = [
    { id: "a", name: "Playgroup", ageRule: "x" },
    { id: "b", name: "Class 1", ageRule: "x" },
  ];

  afterEach(() => {
    state.admission.classes = [];
    state.classLevels.levels = [];
    state.admission.opensOn = "2027-01-01";
    state.now = new Date("2027-02-01T05:00:00Z");
  });

  it("offers the ticked levels in Class Levels order, and the form is open", async () => {
    state.classLevels.levels = levels;
    state.admission.classes = [
      { levelId: "b", name: "Class 1" },
      { levelId: "a", name: "Playgroup" },
    ];
    const { getRegistrationAvailability } = await import("./availability");
    expect(await getRegistrationAvailability()).toMatchObject({ open: true, classes: ["Playgroup", "Class 1"] });
  });

  it("an open window with nothing ticked and nothing typed is closed, so the form shows the Closed message", async () => {
    state.classLevels.levels = levels;
    const { getRegistrationAvailability } = await import("./availability");
    expect(await getRegistrationAvailability()).toMatchObject({ open: false, classes: [] });
  });

  it("a typed name not linked to a level is still offered, so the migration changes nothing for parents (Clarification 1)", async () => {
    state.classLevels.levels = levels;
    state.admission.classes = [{ levelId: "", name: "Grade 9" }];
    const { getRegistrationAvailability } = await import("./availability");
    expect(await getRegistrationAvailability()).toMatchObject({ open: true, classes: ["Grade 9"] });
  });

  it("a level that was ticked and then deleted is no longer offered", async () => {
    state.classLevels.levels = [levels[0]];
    state.admission.classes = [{ levelId: "b", name: "Class 1" }];
    const { getRegistrationAvailability } = await import("./availability");
    expect(await getRegistrationAvailability()).toMatchObject({ open: false, classes: [] });
  });

  it("a ticked level does not open the form outside the admission window", async () => {
    state.classLevels.levels = levels;
    state.admission.classes = [{ levelId: "a", name: "Playgroup" }];
    state.now = new Date("2027-05-01T05:00:00Z");
    const { getRegistrationAvailability } = await import("./availability");
    expect(await getRegistrationAvailability()).toMatchObject({ open: false, classes: ["Playgroup"] });
  });
});
