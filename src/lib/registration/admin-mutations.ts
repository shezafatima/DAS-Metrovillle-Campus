import { isValidObjectId } from "mongoose";
import { connectDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { logSecurityEvent } from "@/lib/log";
import { retentionCutoff } from "@/lib/retention";
import { StudentRegistration } from "@/models/student-registration";
import { REGISTRATION_DELETE_GRACE_DAYS, type RegistrationStatus } from "./rules";

/**
 * Main-admin changes to a registration. Each is ONE conditional write on one
 * document (research §8–§9), so a restore racing the retention sweep ends in
 * exactly one outcome. The log lines carry the registration id and the acting
 * admin's email only.
 */

export interface Actor {
  userId: string;
  email: string;
}

const isId = (id: string) => /^[a-f0-9]{24}$/i.test(id) && isValidObjectId(id);

export type SetStatusResult = "changed" | "unchanged" | "not_found";

/** A same-status call is accepted and records nothing. */
export async function setStatus(id: string, status: RegistrationStatus, actor: Actor, now: Date = new Date()): Promise<SetStatusResult> {
  if (!isId(id)) return "not_found";
  await connectDb();
  // One pipeline update: the history entry reads the OLD status from the same document it replaces.
  const result = await StudentRegistration.updateOne({ _id: id, status: { $ne: status } }, [
    {
      $set: {
        history: {
          $concatArrays: [
            { $ifNull: ["$history", []] },
            [{ at: now, action: "status", from: "$status", to: status, byUserId: { $literal: actor.userId }, byEmail: { $literal: actor.email } }],
          ],
        },
        status,
      },
    },
  ], { updatePipeline: true });
  if (result.matchedCount > 0) {
    logSecurityEvent({ type: "registration_status_changed", target: id, email: actor.email, outcome: status });
    return "changed";
  }
  const exists = await StudentRegistration.exists({ _id: id });
  return exists ? "unchanged" : "not_found";
}

/** Soft delete: hides the record everywhere at once. false when already deleted or unknown. */
export async function softDelete(id: string, actor: Actor, now: Date = new Date()): Promise<boolean> {
  if (!isId(id)) return false;
  await connectDb();
  const result = await StudentRegistration.updateOne(
    { _id: id },
    {
      $set: { deletedAt: now, deletedBy: actor.userId },
      $push: { history: { at: now, action: "deleted", byUserId: actor.userId, byEmail: actor.email } },
    },
  );
  if (result.matchedCount === 0) return false;
  logSecurityEvent({ type: "registration_deleted", target: id, email: actor.email });
  return true;
}

/**
 * Restore within the grace period and the retention period. false when it is
 * not deleted, the grace has ended, retention has passed, or it is gone.
 */
export async function restore(
  id: string,
  actor: Actor,
  now: Date = new Date(),
  months: number = getEnv().REGISTRATION_RETENTION_MONTHS,
): Promise<boolean> {
  if (!isId(id)) return false;
  await connectDb();
  const graceCutoff = new Date(now.getTime() - REGISTRATION_DELETE_GRACE_DAYS * 86_400_000);
  const result = await StudentRegistration.updateOne(
    { _id: id, deletedAt: { $gt: graceCutoff }, createdAt: { $gte: retentionCutoff(now, months) } },
    {
      $set: { deletedAt: null, deletedBy: null },
      $push: { history: { at: now, action: "restored", byUserId: actor.userId, byEmail: actor.email } },
    },
  );
  if (result.matchedCount === 0) return false;
  logSecurityEvent({ type: "registration_restored", target: id, email: actor.email });
  return true;
}
