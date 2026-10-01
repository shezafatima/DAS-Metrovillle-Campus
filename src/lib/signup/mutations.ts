import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { Signup, type SignupDoc } from "@/models/signup";
import type { SignupInput } from "@/lib/validation/signup";

/**
 * The one write path for a public signup submission (ADR-0001: one
 * record per person via a natural-key upsert with restore-on-resignup).
 * `withDeleted: true` is permitted ONLY here — it is what lets this
 * upsert see and restore a soft-deleted record instead of colliding
 * with the unique `email` index. Any other caller in this codebase
 * (list queries, the admin table) must never pass it.
 *
 * This rule applies to signups (one person → one record) specifically
 * and must NOT be copied for contact messages (008-contact), which are
 * append-only — see ADR-0001's Decision section, "Boundary".
 */

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

async function runUpsert(input: SignupInput, now: Date): Promise<SignupDoc> {
  return Signup.findOneAndUpdate(
    { email: input.email },
    {
      $set: { name: input.name, phone: input.phone, lastSignupAt: now, deletedAt: null },
      $addToSet: { sources: input.source },
      $setOnInsert: { firstSignupAt: now },
    },
    { upsert: true, returnDocument: "after", withDeleted: true, runValidators: true },
  );
}

/**
 * Creates, updates or restores the one record for `input.email`
 * (data-model.md "Upsert"). Retries once on a duplicate-key race —
 * two first-time submissions for the same new email arriving at the
 * same moment (research.md §9).
 */
export async function upsertSignup(input: SignupInput, now: Date = new Date()): Promise<SignupDoc> {
  await connectDb();
  try {
    return await runUpsert(input, now);
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Lost the race: another concurrent caller inserted this email
    // between our upsert's find and write. Retry — it will now match
    // and update that document instead of trying to insert a second one.
    return runUpsert(input, now);
  }
}

/**
 * Soft-deletes one signup. Returns `null` for an invalid id or when
 * nothing matched (unknown id, or already deleted — the plugin's
 * default filter excludes deleted docs from softDeleteById's match).
 */
export async function deleteSignup(id: string): Promise<{ id: string } | null> {
  await connectDb();
  if (!mongoose.isValidObjectId(id)) return null;
  const result = await Signup.softDeleteById(id);
  return result ? { id } : null;
}
