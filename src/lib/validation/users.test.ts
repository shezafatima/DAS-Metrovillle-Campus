import { describe, expect, it } from "vitest";
import {
  adminSetPasswordSchema,
  createUserSchema,
  failedField,
  readUserForm,
  targetSchema,
  updateUserAccessSchema,
} from "@/lib/validation/users";

const PW = "a-temporary-password";

describe("adminSetPasswordSchema", () => {
  it("accepts 12 to 128 characters and compares exactly as typed", () => {
    expect(adminSetPasswordSchema.safeParse("a".repeat(12)).success).toBe(true);
    expect(adminSetPasswordSchema.safeParse("a".repeat(128)).success).toBe(true);
    expect(adminSetPasswordSchema.safeParse(" ".repeat(12)).success).toBe(true);
  });

  it("rejects 11 and 129 characters, and non-strings", () => {
    expect(adminSetPasswordSchema.safeParse("a".repeat(11)).success).toBe(false);
    expect(adminSetPasswordSchema.safeParse("a".repeat(129)).success).toBe(false);
    expect(adminSetPasswordSchema.safeParse(undefined).success).toBe(false);
    expect(adminSetPasswordSchema.safeParse(123456789012).success).toBe(false);
  });
});

describe("createUserSchema", () => {
  it("trims and lowercases the email", () => {
    const parsed = createUserSchema.parse({ email: "  Ayesha@School.PK  ", permissions: ["news"], password: PW });
    expect(parsed.email).toBe("ayesha@school.pk");
  });

  it("defaults the role to content_manager and permissions to none", () => {
    const parsed = createUserSchema.parse({ email: "a@school.pk", password: PW });
    expect(parsed.role).toBe("content_manager");
    expect(parsed.permissions).toEqual([]);
  });

  it("requires a password of at least 12 characters", () => {
    expect(createUserSchema.safeParse({ email: "a@school.pk" }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: "a@school.pk", password: "short" }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: "a@school.pk", password: "a".repeat(12) }).success).toBe(true);
  });

  it("rejects an invalid, empty or over-254-character email", () => {
    expect(createUserSchema.safeParse({ email: "not-an-email", password: PW }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: "   ", password: PW }).success).toBe(false);
    expect(createUserSchema.safeParse({ email: `${"a".repeat(250)}@x.pk`, password: PW }).success).toBe(false);
    expect(createUserSchema.safeParse({ password: PW }).success).toBe(false);
  });

  it("rejects grants that are not one of the five keys: main_admin, users, registrations, unknown", () => {
    for (const bad of ["main_admin", "users", "registrations", "bogus"]) {
      expect(createUserSchema.safeParse({ email: "a@school.pk", permissions: [bad], password: PW }).success).toBe(false);
    }
  });

  it("accepts all five grantable keys", () => {
    const all = ["news", "messages", "careers", "settings", "pages"];
    expect(createUserSchema.parse({ email: "a@school.pk", permissions: all, password: PW }).permissions).toEqual(all);
  });

  it("rejects an unknown role", () => {
    expect(createUserSchema.safeParse({ email: "a@school.pk", role: "superuser", password: PW }).success).toBe(false);
  });
});

describe("failedField", () => {
  it("names the field the first failure belongs to", () => {
    const badEmail = createUserSchema.safeParse({ email: "nope", password: PW });
    const badPassword = createUserSchema.safeParse({ email: "a@school.pk", password: "short" });
    expect(!badEmail.success && failedField(badEmail.error)).toBe("email");
    expect(!badPassword.success && failedField(badPassword.error)).toBe("password");
  });

  it("returns nothing for a failure that is not the email or password", () => {
    const badRole = createUserSchema.safeParse({ email: "a@school.pk", role: "x", password: PW });
    expect(!badRole.success && failedField(badRole.error)).toBeUndefined();
  });
});

describe("updateUserAccessSchema", () => {
  it("requires a targetId and a role; the password is optional", () => {
    expect(updateUserAccessSchema.safeParse({ role: "content_manager", permissions: [] }).success).toBe(false);
    expect(updateUserAccessSchema.safeParse({ targetId: "", role: "content_manager", permissions: [] }).success).toBe(false);
    expect(updateUserAccessSchema.safeParse({ targetId: "u1", permissions: [] }).success).toBe(false);
    expect(updateUserAccessSchema.safeParse({ targetId: "u1", role: "main_admin", permissions: [] }).success).toBe(true);
  });

  it("when a password is given it must be 12 to 128 characters", () => {
    const base = { targetId: "u1", role: "content_manager", permissions: [] };
    expect(updateUserAccessSchema.safeParse({ ...base, password: "short" }).success).toBe(false);
    expect(updateUserAccessSchema.safeParse({ ...base, password: PW }).success).toBe(true);
  });
});

describe("targetSchema", () => {
  it("requires a non-empty targetId", () => {
    expect(targetSchema.safeParse({ targetId: "u1" }).success).toBe(true);
    expect(targetSchema.safeParse({ targetId: "" }).success).toBe(false);
    expect(targetSchema.safeParse({}).success).toBe(false);
  });
});

describe("readUserForm", () => {
  it("collects repeated permissions fields", () => {
    const fd = new FormData();
    fd.set("email", "a@school.pk");
    fd.append("permissions", "news");
    fd.append("permissions", "messages");
    expect(readUserForm(fd).permissions).toEqual(["news", "messages"]);
  });

  it("returns no permissions when none are ticked", () => {
    expect(readUserForm(new FormData()).permissions).toEqual([]);
  });

  it("treats an empty password field as 'not setting one', never as an empty password", () => {
    const empty = new FormData();
    empty.set("password", "");
    expect(readUserForm(empty).password).toBeUndefined();
    expect(readUserForm(new FormData()).password).toBeUndefined();
    const filled = new FormData();
    filled.set("password", PW);
    expect(readUserForm(filled).password).toBe(PW);
  });
});
