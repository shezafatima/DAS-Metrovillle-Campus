// @vitest-environment node
import { expect, it } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";
import { upsertSignup, deleteSignup } from "@/lib/signup/mutations";
import type { SignupInput } from "@/lib/validation/signup";

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

  // Update/restore/concurrency cases are added in US2 (T027) and US4 (T043).
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
