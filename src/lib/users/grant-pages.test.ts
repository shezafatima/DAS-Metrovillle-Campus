// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

/** Accounts inserted directly (no password needed): the grant only reads and writes `permissions`. */
const SEED = [
  { email: "settings-only@example.test", role: "content_manager", permissions: ["settings"], disabledAt: null, deletedAt: null },
  { email: "already@example.test", role: "content_manager", permissions: ["settings", "pages"], disabledAt: null, deletedAt: null },
  { email: "news-only@example.test", role: "content_manager", permissions: ["news"], disabledAt: null, deletedAt: null },
  { email: "deleted@example.test", role: "content_manager", permissions: ["settings"], disabledAt: null, deletedAt: new Date() },
  { email: "disabled@example.test", role: "content_manager", permissions: ["news", "settings"], disabledAt: new Date(), deletedAt: null },
  { email: "boss@example.test", role: "main_admin", permissions: ["settings"], disabledAt: null, deletedAt: null },
];

async function users() {
  return mongoose.connection.db!.collection("user");
}

async function snapshot() {
  const list = await (await users()).find({}, { projection: { _id: 0 } }).sort({ email: 1 }).toArray();
  const changes = await mongoose.connection.db!.collection("userChanges").countDocuments();
  return { list, changes };
}

describeWithDb("grantPagesToSettingsHolders (014 Q3: one-time, idempotent)", ["user", "userChanges"], () => {
  beforeEach(async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    await (await users()).insertMany(SEED.map((user) => ({ ...user, name: "seed", emailVerified: true })));
  });

  it("a dry run lists the accounts it would change and writes nothing", async () => {
    const { grantPagesToSettingsHolders } = await import("./grant-pages");
    const before = await snapshot();
    const result = await grantPagesToSettingsHolders({ dryRun: true });
    expect(result.changed).toBe(0);
    expect(result.accounts).toEqual([
      { email: "disabled@example.test", permissions: ["news", "settings"] },
      { email: "settings-only@example.test", permissions: ["settings"] },
    ]);
    expect(await snapshot()).toEqual(before);
  });

  it("adds Pages to active and disabled Settings holders only, with one change entry each", async () => {
    const { grantPagesToSettingsHolders, GRANT_ACTOR } = await import("./grant-pages");
    const result = await grantPagesToSettingsHolders();
    expect(result.changed).toBe(2);
    expect(result.accounts.map((a) => a.email)).toEqual(["disabled@example.test", "settings-only@example.test"]);

    const byEmail = Object.fromEntries((await (await users()).find({}).toArray()).map((u) => [u.email, u]));
    expect(byEmail["settings-only@example.test"].permissions).toEqual(["settings", "pages"]);
    expect(byEmail["disabled@example.test"].permissions).toEqual(["news", "settings", "pages"]);
    // Untouched: already had Pages, no Settings, deleted, main admin.
    expect(byEmail["already@example.test"].permissions).toEqual(["settings", "pages"]);
    expect(byEmail["news-only@example.test"].permissions).toEqual(["news"]);
    expect(byEmail["deleted@example.test"].permissions).toEqual(["settings"]);
    expect(byEmail["boss@example.test"].permissions).toEqual(["settings"]);
    // Nothing else changed on the changed accounts.
    expect(byEmail["disabled@example.test"].disabledAt).toBeInstanceOf(Date);
    expect(byEmail["settings-only@example.test"].role).toBe("content_manager");

    const entries = await mongoose.connection.db!.collection("userChanges").find({}).sort({ targetEmail: 1 }).toArray();
    expect(entries).toHaveLength(2);
    for (const [index, email] of ["disabled@example.test", "settings-only@example.test"].entries()) {
      expect(entries[index]).toMatchObject({
        actorId: GRANT_ACTOR.actorId,
        actorEmail: "system:014-grant-pages",
        targetEmail: email,
        type: "permissions_changed",
        details: { added: ["pages"], removed: [] },
      });
    }
  });

  it("a second run changes no account and writes no entry", async () => {
    const { grantPagesToSettingsHolders } = await import("./grant-pages");
    await grantPagesToSettingsHolders();
    const before = await snapshot();
    expect(await grantPagesToSettingsHolders()).toEqual({ changed: 0, accounts: [] });
    expect(await snapshot()).toEqual(before);
  });

  it("running two grants at once still changes each account once", async () => {
    const { grantPagesToSettingsHolders } = await import("./grant-pages");
    const [a, b] = await Promise.all([grantPagesToSettingsHolders(), grantPagesToSettingsHolders()]);
    expect(a.changed + b.changed).toBe(2);
    expect(await mongoose.connection.db!.collection("userChanges").countDocuments()).toBe(2);
    const changed = await (await users()).findOne({ email: "settings-only@example.test" });
    expect(changed?.permissions).toEqual(["settings", "pages"]);
  });
});
