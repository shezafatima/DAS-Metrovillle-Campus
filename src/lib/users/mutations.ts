import { getAuth } from "@/lib/auth";
import { connectDb } from "@/lib/db";
import { logSecurityEvent } from "@/lib/log";
import { isRole, normalizePermissions, type Permission, type Role } from "@/lib/permissions";
import { ensureUserEmailIndex } from "@/lib/users/indexes";
import { countActiveMainAdmins } from "@/lib/users/queries";
import { UserChange, type UserChangeType } from "@/models/user-change";

/**
 * Account and permission changes (011). Every function here acts on
 * explicit ids passed by an action that has already checked who is asking
 * (src/lib/dal.ts). Nothing here logs or records a password.
 */

/** What each change type stores in `details` (data-model.md). Never a password, hash or token. */
export type UserChangeDetails =
  | { role: Role; permissions: Permission[]; restored: boolean } // created
  | { from: Role; to: Role } // role_changed
  | { added: Permission[]; removed: Permission[] } // permissions_changed
  | Record<string, never>; // everything else

export interface UserChangeEntry {
  actorId: string;
  actorEmail: string;
  targetId: string;
  targetEmail: string;
  type: UserChangeType;
  details?: UserChangeDetails;
}

/**
 * Appends one entry to the record. A failed write is reported by error
 * name only and never thrown: the change it describes has already
 * happened, and undoing an account change because the record could not be
 * written would be worse. The security log is the second trail (research §9).
 */
export async function recordUserChange(entry: UserChangeEntry): Promise<void> {
  try {
    await connectDb();
    await UserChange.create({ ...entry, details: entry.details ?? {}, at: new Date() });
  } catch (err) {
    console.error("recordUserChange failed:", err instanceof Error ? err.name : typeof err);
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

export interface Actor {
  userId: string;
  email: string;
}

export type CreateUserResult =
  | { ok: true; email: string }
  | { ok: false; error: "email_taken" | "unavailable" };

/**
 * Creates an account — or restores a soft-deleted one — for a main admin
 * (011 FR-020, FR-021, Clarification 3). `email` is already trimmed and
 * lowercased by the caller's schema.
 *
 * - A non-deleted account with this email: `email_taken`. The database's
 *   unique email index settles a concurrent double-create (the loser gets
 *   a duplicate-key error, mapped to the same answer).
 * - A soft-deleted account: the same record is restored as a brand-new
 *   account. Nothing from before the deletion carries over: role,
 *   grants, password, sessions and disabled state are all replaced.
 *
 * `password` is the one the admin typed or generated in the panel (already
 * length-checked by the caller's schema). The main admin controls every
 * password (Constitution III): it is the user's password until a main admin
 * changes it. It is hashed with Better Auth's own hasher and appears nowhere
 * else: not returned, not in the change record, not in the security log, not
 * in any error.
 */
export async function createOrRestoreUser({
  actor,
  email,
  role,
  permissions,
  password,
}: {
  actor: Actor;
  email: string;
  role: Role;
  permissions: Permission[];
  password: string;
}): Promise<CreateUserResult> {
  try {
    await ensureUserEmailIndex();
    const auth = await getAuth();
    const ctx = await auth.$context;

    const hash = await ctx.password.hash(password);
    // A main admin can use every section whatever is stored, so nothing is stored.
    const grants = role === "main_admin" ? [] : normalizePermissions(permissions);
    const fresh = {
      role,
      permissions: grants,
      disabledAt: null,
      deletedAt: null,
    };

    let userId: string;
    let restored = false;

    const existing = await ctx.internalAdapter.findUserByEmail(email);
    if (existing) {
      if (!(existing.user as { deletedAt?: Date | null }).deletedAt) return { ok: false, error: "email_taken" };
      restored = true;
      userId = existing.user.id;
      await ctx.internalAdapter.updateUser(userId, fresh);
      await ctx.internalAdapter.updatePassword(userId, hash);
      await ctx.internalAdapter.deleteUserSessions(userId);
    } else {
      let created;
      try {
        created = await ctx.internalAdapter.createUser(
          { email, name: email.split("@")[0], emailVerified: true, ...fresh },
          { method: "email-password" },
        );
      } catch (err) {
        if (isDuplicateKeyError(err)) return { ok: false, error: "email_taken" };
        throw err;
      }
      userId = created.id;
      try {
        await ctx.internalAdapter.linkAccount({ userId, providerId: "credential", accountId: userId, password: hash });
      } catch (err) {
        // A user with no credential account could never log in, and would
        // block this email for good. Undo the half-created account.
        await ctx.internalAdapter.deleteUser(userId).catch(() => {});
        throw err;
      }
    }

    await recordUserChange({
      actorId: actor.userId,
      actorEmail: actor.email,
      targetId: userId,
      targetEmail: email,
      type: "created",
      details: { role, permissions: grants, restored },
    });
    logSecurityEvent({ type: "user_created", email: actor.email, target: email });
    return { ok: true, email };
  } catch (err) {
    console.error("createOrRestoreUser failed:", err instanceof Error ? err.name : typeof err);
    return { ok: false, error: "unavailable" };
  }
}

// ---------------------------------------------------------------------------
// Managing other users (011 US4). Every function refuses to act on the
// caller's own account (`self`, FR-011/FR-026): a main admin changes their
// own password on the Account page, and cannot disable, delete, demote or
// re-role themselves.
// ---------------------------------------------------------------------------

export type ManageUserError = "self" | "not_found" | "last_main_admin" | "unavailable";
export type ManageUserResult = { ok: true } | { ok: false; error: ManageUserError };

interface TargetUser {
  id: string;
  email: string;
  role: Role;
  permissions: Permission[];
  disabledAt: Date | null;
  deletedAt: Date | null;
}

const OBJECT_ID = /^[a-f0-9]{24}$/i;

/** The target as the account stores it, or null when it doesn't exist or is deleted. */
async function loadTarget(targetId: string): Promise<TargetUser | null> {
  if (!OBJECT_ID.test(targetId)) return null;
  const ctx = await (await getAuth()).$context;
  const user = (await ctx.internalAdapter.findUserById(targetId)) as
    | (Record<string, unknown> & { id: string; email: string })
    | null;
  if (!user || user.deletedAt) return null;
  return {
    id: user.id,
    email: user.email,
    role: isRole(user.role) ? user.role : "content_manager",
    permissions: normalizePermissions(user.permissions),
    disabledAt: (user.disabledAt as Date | null | undefined) ?? null,
    deletedAt: null,
  };
}

async function updateTarget(targetId: string, data: Record<string, unknown>): Promise<void> {
  const ctx = await (await getAuth()).$context;
  await ctx.internalAdapter.updateUser(targetId, data);
}

async function endSessions(targetId: string): Promise<void> {
  const ctx = await (await getAuth()).$context;
  await ctx.internalAdapter.deleteUserSessions(targetId);
}

/**
 * Keeps at least one active main admin, even when two actions race (011
 * FR-027, research §8). Transactions are not assumed, so this is: write,
 * recount, and undo if the write left none. The actor is an active main
 * admin other than the target, so the only race is two main admins acting
 * on each other; each recount sees the writes already committed, so at
 * most one such change survives. Worst case both are refused and retried.
 */
async function guardLastMainAdmin(apply: () => Promise<void>, revert: () => Promise<void>): Promise<boolean> {
  await apply();
  if ((await countActiveMainAdmins()) >= 1) return true;
  await revert();
  return false;
}

function isActiveMainAdmin(target: TargetUser): boolean {
  return target.role === "main_admin" && !target.disabledAt;
}

function unavailable(scope: string, err: unknown): ManageUserResult {
  console.error(`${scope} failed:`, err instanceof Error ? err.name : typeof err);
  return { ok: false, error: "unavailable" };
}

/** Changes another user's role and/or sections. Nothing is recorded when nothing changed. */
export async function updateUserAccess({
  actor,
  targetId,
  role,
  permissions,
  password,
}: {
  actor: Actor;
  targetId: string;
  role: Role;
  permissions: Permission[];
  /** When given, also sets the user's password to it and ends their sessions. */
  password?: string;
}): Promise<ManageUserResult> {
  if (targetId === actor.userId) return { ok: false, error: "self" };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, error: "not_found" };

    const newGrants = role === "main_admin" ? [] : normalizePermissions(permissions);
    const roleChanged = target.role !== role;
    const added = newGrants.filter((key) => !target.permissions.includes(key));
    const removed = target.permissions.filter((key) => !newGrants.includes(key));
    // A main admin's stored grants are meaningless, so promoting someone is
    // one role change, not a list of "removed" sections.
    const grantsChanged = role === "content_manager" && (added.length > 0 || removed.length > 0);
    const storedGrantsDiffer = added.length > 0 || removed.length > 0;
    if (roleChanged || storedGrantsDiffer) {
      const apply = () => updateTarget(targetId, { role, permissions: newGrants });
      if (roleChanged && isActiveMainAdmin(target)) {
        const kept = await guardLastMainAdmin(apply, () =>
          updateTarget(targetId, { role: target.role, permissions: target.permissions }),
        );
        if (!kept) return { ok: false, error: "last_main_admin" };
      } else {
        await apply();
      }

      const base = { actorId: actor.userId, actorEmail: actor.email, targetId, targetEmail: target.email };
      if (roleChanged) await recordUserChange({ ...base, type: "role_changed", details: { from: target.role, to: role } });
      if (grantsChanged) await recordUserChange({ ...base, type: "permissions_changed", details: { added, removed } });
      logSecurityEvent({ type: "user_access_changed", email: actor.email, target: target.email });
    }

    // The panel's password field, when filled, sets a new password (FR-024): saved last,
    // so a refused role change never leaves a half-applied edit behind.
    if (password) await applyPasswordReset({ actor, target, password });
    return { ok: true };
  } catch (err) {
    return unavailable("updateUserAccess", err);
  }
}

/** Disables another user: no login, and every session ends at once (FR-023). */
export async function disableUser({ actor, targetId }: { actor: Actor; targetId: string }): Promise<ManageUserResult> {
  if (targetId === actor.userId) return { ok: false, error: "self" };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, error: "not_found" };
    if (target.disabledAt) return { ok: true };

    const apply = () => updateTarget(targetId, { disabledAt: new Date() });
    if (isActiveMainAdmin(target)) {
      if (!(await guardLastMainAdmin(apply, () => updateTarget(targetId, { disabledAt: null })))) {
        return { ok: false, error: "last_main_admin" };
      }
    } else {
      await apply();
    }
    await endSessions(targetId);

    await recordUserChange({
      actorId: actor.userId,
      actorEmail: actor.email,
      targetId,
      targetEmail: target.email,
      type: "disabled",
    });
    logSecurityEvent({ type: "user_disabled", email: actor.email, target: target.email });
    return { ok: true };
  } catch (err) {
    return unavailable("disableUser", err);
  }
}

/** Re-enables a disabled user: login works again with the same password and grants. */
export async function enableUser({ actor, targetId }: { actor: Actor; targetId: string }): Promise<ManageUserResult> {
  if (targetId === actor.userId) return { ok: false, error: "self" };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, error: "not_found" };
    if (!target.disabledAt) return { ok: true };

    await updateTarget(targetId, { disabledAt: null });
    await recordUserChange({
      actorId: actor.userId,
      actorEmail: actor.email,
      targetId,
      targetEmail: target.email,
      type: "enabled",
    });
    logSecurityEvent({ type: "user_enabled", email: actor.email, target: target.email });
    return { ok: true };
  } catch (err) {
    return unavailable("enableUser", err);
  }
}

/**
 * Sets a new password for another user and ends their sessions (FR-024).
 * The old password stops working at once. The password is the one typed or
 * generated in the panel: hashed here, never returned, logged or recorded.
 */
async function applyPasswordReset({
  actor,
  target,
  password,
}: {
  actor: Actor;
  target: TargetUser;
  password: string;
}): Promise<void> {
  const ctx = await (await getAuth()).$context;
  await ctx.internalAdapter.updatePassword(target.id, await ctx.password.hash(password));
  await endSessions(target.id);

  await recordUserChange({
    actorId: actor.userId,
    actorEmail: actor.email,
    targetId: target.id,
    targetEmail: target.email,
    type: "password_set",
  });
  logSecurityEvent({ type: "password_set", email: actor.email, target: target.email });
}

export async function resetUserPassword({
  actor,
  targetId,
  password,
}: {
  actor: Actor;
  targetId: string;
  password: string;
}): Promise<ManageUserResult> {
  if (targetId === actor.userId) return { ok: false, error: "self" };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, error: "not_found" };
    await applyPasswordReset({ actor, target, password });
    return { ok: true };
  } catch (err) {
    return unavailable("resetUserPassword", err);
  }
}

/** Soft-deletes another user: sessions end, login stops, the record stays (FR-025, Constitution VI). */
export async function deleteUser({ actor, targetId }: { actor: Actor; targetId: string }): Promise<ManageUserResult> {
  if (targetId === actor.userId) return { ok: false, error: "self" };
  try {
    const target = await loadTarget(targetId);
    if (!target) return { ok: false, error: "not_found" };

    const apply = () => updateTarget(targetId, { deletedAt: new Date() });
    if (isActiveMainAdmin(target)) {
      if (!(await guardLastMainAdmin(apply, () => updateTarget(targetId, { deletedAt: null })))) {
        return { ok: false, error: "last_main_admin" };
      }
    } else {
      await apply();
    }
    await endSessions(targetId);

    await recordUserChange({
      actorId: actor.userId,
      actorEmail: actor.email,
      targetId,
      targetEmail: target.email,
      type: "deleted",
    });
    logSecurityEvent({ type: "user_deleted", email: actor.email, target: target.email });
    return { ok: true };
  } catch (err) {
    return unavailable("deleteUser", err);
  }
}
