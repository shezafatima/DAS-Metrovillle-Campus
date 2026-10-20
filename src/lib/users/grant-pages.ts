import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { recordUserChange } from "@/lib/users/mutations";

/**
 * The one-time Pages grant (014 spec Q3, research R14, ADR-0013). 014 moves
 * the Home and Resources settings and the Admission messages from the
 * Settings permission to Pages, so every content manager who holds Settings
 * gets Pages too, and nobody loses what they can edit today.
 *
 * Idempotent: each account is changed by one conditional update that only
 * matches while the account still lacks Pages, and a change-record entry is
 * written only when that update changed something. A second run (or a grant
 * the main admin already made by hand) changes and records nothing.
 *
 * Main admins are skipped (their role grants everything; stored grants are
 * irrelevant). Disabled accounts are included, so re-enabling one restores
 * what it could reach before. Deleted accounts are skipped.
 */

export const GRANT_ACTOR = { actorId: "system", actorEmail: "system:014-grant-pages" } as const;

export interface GrantPagesResult {
  /** Accounts changed (0 in a dry run). */
  changed: number;
  /** The accounts that matched: would change (dry run) or did change. */
  accounts: { email: string; permissions: string[] }[];
}

const matchesGrant = {
  // A missing or unknown role reads as content_manager everywhere (src/lib/dal.ts).
  role: { $ne: "main_admin" },
  deletedAt: null,
  permissions: { $eq: "settings", $ne: "pages" },
};

export async function grantPagesToSettingsHolders({ dryRun = false }: { dryRun?: boolean } = {}): Promise<GrantPagesResult> {
  await connectDb();
  const users = mongoose.connection.db!.collection("user");
  const candidates = await users
    .find(matchesGrant, { projection: { _id: 1, email: 1, permissions: 1 } })
    .sort({ email: 1 })
    .toArray();

  const accounts = candidates.map((user) => ({
    email: String(user.email),
    permissions: Array.isArray(user.permissions) ? user.permissions.map(String) : [],
  }));
  if (dryRun) return { changed: 0, accounts };

  const changedAccounts: GrantPagesResult["accounts"] = [];
  for (const [index, user] of candidates.entries()) {
    const result = await users.updateOne({ _id: user._id, ...matchesGrant }, { $addToSet: { permissions: "pages" } });
    if (result.modifiedCount !== 1) continue;
    changedAccounts.push(accounts[index]);
    await recordUserChange({
      ...GRANT_ACTOR,
      targetId: String(user._id),
      targetEmail: String(user.email),
      type: "permissions_changed",
      details: { added: ["pages"], removed: [] },
    });
    logSecurityEvent({ type: "user_access_changed", email: GRANT_ACTOR.actorEmail, target: String(user.email) });
  }
  return { changed: changedAccounts.length, accounts: changedAccounts };
}
