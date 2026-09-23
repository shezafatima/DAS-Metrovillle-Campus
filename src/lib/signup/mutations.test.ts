// @vitest-environment node
import { expect, it } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { upsertSignup, deleteSignup } from "@/lib/signup/mutations";
import { signupInputSchema, type SignupInput } from "@/lib/validation/signup";
import { Signup } from "@/models/signup";

function input(overrides: Partial<SignupInput> = {}): SignupInput {
  return {
    name: "Ali Khan",
    email: "ali@example.com",
    phone: "+923001234567",
    source: "home",
    ...overrides,
  };
}

describeWithDb("upsertSignup", ["signups"], () => {
  it("creates a document with matching first/latest dates and one source", async () => {
    const now = new Date();
    const doc = await upsertSignup(input(), now);
    expect(doc.email).toBe("ali@example.com");
    expect(doc.firstSignupAt.getTime()).toBe(now.getTime());
    expect(doc.lastSignupAt.getTime()).toBe(now.getTime());
    expect(doc.sources).toEqual(["home"]);
    expect(doc.deletedAt).toBeNull();
  });

  it("stores the email exactly as given (schema normalises before this layer)", async () => {
    const doc = await upsertSignup(input({ email: "ali@example.com" }));
    expect(doc.email).toBe("ali@example.com");
  });

  it("updates the same record on a repeat submission with a different casing/spacing of the email (ADR-0001)", async () => {
    const now1 = new Date("2026-09-01T00:00:00Z");
    const created = await upsertSignup(input(), now1);

    // The visitor's second submission, as it would arrive after the
    // shared Zod schema normalises it (schema-parsed, not hand-typed
    // here) — proves the upsert finds the same document regardless of
    // how the email was originally cased/spaced.
    const parsed = signupInputSchema.parse({
      name: "Ali Ahmed Khan",
      email: " ALI@example.com ",
      phone: "0300-1234567",
      source: "resources",
    });
    const now2 = new Date("2026-09-05T00:00:00Z");
    const updated = await upsertSignup(parsed, now2);

    expect(updated._id.toString()).toBe(created._id.toString());
    const count = await Signup.countDocuments({ email: "ali@example.com" }).setOptions({ withDeleted: true });
    expect(count).toBe(1);
    expect(updated.name).toBe("Ali Ahmed Khan");
    expect(updated.phone).toBe("+923001234567");
    expect(updated.firstSignupAt.getTime()).toBe(now1.getTime());
    expect(updated.lastSignupAt.getTime()).toBe(now2.getTime());
    expect(updated.sources.slice().sort()).toEqual(["home", "resources"]);

    // A third submission from a page already in `sources` does not duplicate it.
    const third = await upsertSignup(input({ source: "home" }), new Date("2026-09-06T00:00:00Z"));
    expect(third.sources.slice().sort()).toEqual(["home", "resources"]);
  });

  it("leaves exactly one document after 10 concurrent first-time submissions for one new email (research §9)", async () => {
    const now = new Date();
    const email = "concurrent@example.com";
    const attempts = Array.from({ length: 10 }, (_, i) =>
      upsertSignup(input({ email, name: `Concurrent ${i}` }), now),
    );

    const results = await Promise.allSettled(attempts);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const count = await Signup.countDocuments({ email }).setOptions({ withDeleted: true });
    expect(count).toBe(1);

    const doc = await Signup.findOne({ email });
    expect(doc!.firstSignupAt.getTime()).toBeLessThanOrEqual(doc!.lastSignupAt.getTime());
  });
});

describeWithDb("deleteSignup", ["signups"], () => {
  it("soft-deletes a live record", async () => {
    const created = await upsertSignup(input());
    const result = await deleteSignup(created._id.toString());
    expect(result).toEqual({ id: created._id.toString() });
  });

  it("returns null when the record is already deleted", async () => {
    const created = await upsertSignup(input());
    const id = created._id.toString();
    await deleteSignup(id);
    const second = await deleteSignup(id);
    expect(second).toBeNull();
  });

  it("returns null for a malformed id without throwing", async () => {
    await expect(deleteSignup("not-an-id")).resolves.toBeNull();
  });

  it("returns null for a well-formed but unknown id", async () => {
    const unknownId = new mongoose.Types.ObjectId().toString();
    await expect(deleteSignup(unknownId)).resolves.toBeNull();
  });
});
