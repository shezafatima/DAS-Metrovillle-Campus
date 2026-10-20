// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { PANELS } from "./panels";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const seededAt = new Date("2026-10-19T10:00:00Z");

async function seedPending(group: string, data: Record<string, unknown>) {
  const { Settings } = await import("@/models/settings");
  await Settings.create({ _id: group, data, version: 3, updatedBy: "system:014b-seed", pendingConfirmation: { source: "das.edu.pk /x", seededAt } });
}

async function stored(group: string) {
  const { Settings } = await import("@/models/settings");
  return Settings.findById(group).lean();
}

describeWithDb("confirmPanel (014b: Mark as confirmed by client)", ["settings"], () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("clears the pending mark, logs once, and leaves the content, version and panel saves alone", async () => {
    await seedPending("examination", { blocks: [{ id: "b1", deletedAt: null, heading: "H", body: "B" }] });
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { confirmPanel } = await import("./confirm");

    expect(await confirmPanel(PANELS.examination, "admin@school.pk")).toEqual({ changed: true });
    const doc = await stored("examination");
    expect(doc?.pendingConfirmation).toBeNull();
    expect(doc).toMatchObject({ version: 3, updatedBy: "system:014b-seed", data: { blocks: [{ heading: "H" }] } });
    const lines = info.mock.calls.map((call) => String(call[0])).filter((text) => text.includes("settings_confirmed"));
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0])).toMatchObject({ type: "settings_confirmed", group: "examination", panel: "examination", email: "admin@school.pk" });
  });

  it("a second call changes nothing and logs nothing", async () => {
    await seedPending("portalLinks", { links: [] });
    const { confirmPanel } = await import("./confirm");
    await confirmPanel(PANELS["portal-links"], "admin@school.pk");
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    expect(await confirmPanel(PANELS["portal-links"], "other@school.pk")).toEqual({ changed: false });
    expect(info.mock.calls.map((call) => String(call[0])).some((text) => text.includes("settings_confirmed"))).toBe(false);
  });

  it("a group that was never seeded, or has no record, has nothing to confirm", async () => {
    const { Settings } = await import("@/models/settings");
    await Settings.create({ _id: "syllabi", data: { levels: [] }, version: 1, updatedBy: "admin@school.pk" });
    const { confirmPanel } = await import("./confirm");
    expect(await confirmPanel(PANELS.syllabi, "admin@school.pk")).toEqual({ changed: false });
    expect(await confirmPanel(PANELS.examination, "admin@school.pk")).toEqual({ changed: false });
  });

  it("only touches the group the panel edits", async () => {
    await seedPending("syllabi", { levels: [] });
    await seedPending("examination", { blocks: [] });
    const { confirmPanel } = await import("./confirm");
    await confirmPanel(PANELS.syllabi, "admin@school.pk");
    expect((await stored("syllabi"))?.pendingConfirmation).toBeNull();
    expect((await stored("examination"))?.pendingConfirmation).toMatchObject({ source: "das.edu.pk /x" });
  });

  it("cannot be used for the gallery, which has no settings group", async () => {
    const { confirmPanel } = await import("./confirm");
    await expect(confirmPanel(PANELS["photo-gallery"], "admin@school.pk")).rejects.toThrow();
  });
});
