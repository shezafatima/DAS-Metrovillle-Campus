// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, seedTestContentManager } from "@/test/admin-session";
import { countActiveMainAdmins, deriveUserStatus, listUserChanges, listUsers } from "@/lib/users/queries";
import { recordUserChange } from "@/lib/users/mutations";

describe("deriveUserStatus (pure)", () => {
  it("active unless disabled: there is no pending state, the main admin sets every password", () => {
    expect(deriveUserStatus({})).toBe("active");
    expect(deriveUserStatus({ disabledAt: null })).toBe("active");
  });

  it("disabled when disabledAt is set", () => {
    expect(deriveUserStatus({ disabledAt: new Date() })).toBe("disabled");
  });
});

describeWithDb("users queries", ["user", "account", "session", "userChanges"], () => {
  it("listUsers returns non-deleted accounts by email with derived fields, and no secrets", async () => {
    await seedTestAdmin("b-admin@example.test", "correct-horse-battery");
    await seedTestContentManager("a-manager@example.test", "correct-horse-battery", ["news", "messages"]);
    await seedTestContentManager("c-disabled@example.test", "correct-horse-battery", [], { disabledAt: new Date() });
    await seedTestContentManager("d-deleted@example.test", "correct-horse-battery", [], { deletedAt: new Date() });

    const users = await listUsers();
    expect(users.map((u) => u.email)).toEqual(["a-manager@example.test", "b-admin@example.test", "c-disabled@example.test"]);
    expect(users.map((u) => u.status)).toEqual(["active", "active", "disabled"]);
    expect(users[0]).toMatchObject({ role: "content_manager", permissions: ["news", "messages"], lastLoginAt: null });
    expect(users[1]).toMatchObject({ role: "main_admin" });
    expect(JSON.stringify(users)).not.toMatch(/password|hash/i);
  });

  it("countActiveMainAdmins ignores disabled, deleted and content-manager accounts", async () => {
    await seedTestAdmin("one@example.test", "correct-horse-battery");
    await seedTestAdmin("two@example.test", "correct-horse-battery", { disabledAt: new Date() });
    await seedTestAdmin("three@example.test", "correct-horse-battery", { deletedAt: new Date() });
    await seedTestContentManager("four@example.test", "correct-horse-battery", ["news"]);
    expect(await countActiveMainAdmins()).toBe(1);
  });

  it("listUserChanges is newest first and pages 20 at a time", async () => {
    for (let i = 0; i < 25; i++) {
      await recordUserChange({
        actorId: "actor",
        actorEmail: "admin@example.test",
        targetId: `t${i}`,
        targetEmail: `user${i}@example.test`,
        type: "disabled",
      });
    }

    const first = await listUserChanges({ page: 1 });
    expect(first.total).toBe(25);
    expect(first.totalPages).toBe(2);
    expect(first.items).toHaveLength(20);
    const times = first.items.map((i) => i.at.getTime());
    expect(times).toEqual([...times].sort((a, b) => b - a));
    expect(first.items[0]!.targetEmail).toBe("user24@example.test");

    const second = await listUserChanges({ page: 2 });
    expect(second.items).toHaveLength(5);
    expect(second.items.at(-1)!.targetEmail).toBe("user0@example.test");
  });

  it("listUserChanges clamps an out-of-range page and handles an empty record", async () => {
    const empty = await listUserChanges({ page: 7 });
    expect(empty).toMatchObject({ total: 0, totalPages: 1, page: 1, items: [] });
  });
});
