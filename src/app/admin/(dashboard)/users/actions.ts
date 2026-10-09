"use server";

import { revalidatePath } from "next/cache";
import { requireAdminAccess } from "@/lib/dal";
import {
  createOrRestoreUser,
  deleteUser as deleteUserFor,
  disableUser as disableUserFor,
  enableUser as enableUserFor,
  updateUserAccess as updateUserAccessFor,
  type ManageUserResult,
} from "@/lib/users/mutations";
import {
  createUserSchema,
  failedField,
  readUserForm,
  targetSchema,
  updateUserAccessSchema,
  type UserActionErrorKey,
  type UserFormField,
} from "@/lib/validation/users";

/**
 * User-management Server Actions (011, contracts/user-actions.md). Each
 * one starts with `requireAdminAccess("main_admin")`, reads only its own
 * fields, validates with the shared schema, and returns a copy key — never
 * Better Auth error text and never a password. The actor always comes from
 * the session. Next checks the request's Origin against the host for every
 * Server Action (FR-029), the same protection the 010 account actions rely on.
 *
 * The password the admin types or generates in the panel arrives in the
 * request, is hashed, and goes no further: it is not returned, logged or
 * recorded, and the panel forgets it when it closes.
 */
export type UserFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: UserActionErrorKey; field?: UserFormField };

export type ManageUserState = UserFormState;

/** Adds a user (or restores a deleted one with the same email). */
export async function createUser(_prev: unknown, formData: FormData): Promise<UserFormState> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };

  const form = readUserForm(formData);
  const parsed = createUserSchema.safeParse({
    email: form.email,
    role: form.role,
    permissions: form.permissions,
    password: form.password,
  });
  if (!parsed.success) {
    const field = failedField(parsed.error);
    return { status: "error", error: "invalid", ...(field ? { field } : {}) };
  }

  const result = await createOrRestoreUser({
    actor: actorOf(access.session),
    email: parsed.data.email,
    role: parsed.data.role,
    permissions: parsed.data.permissions,
    password: parsed.data.password,
  });
  if (!result.ok) {
    return { status: "error", error: result.error, ...(result.error === "email_taken" ? { field: "email" as const } : {}) };
  }

  revalidatePath("/admin/users");
  return { status: "success" };
}

/**
 * Edits another user's role and sections, and — when the password field is
 * filled — resets their password to it. A user can never call this on
 * themselves (`self`).
 */
export async function updateUserAccess(_prev: unknown, formData: FormData): Promise<UserFormState> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };

  const form = readUserForm(formData);
  const parsed = updateUserAccessSchema.safeParse({
    targetId: form.targetId,
    role: form.role,
    permissions: form.permissions,
    password: form.password,
  });
  if (!parsed.success) {
    const field = failedField(parsed.error);
    return { status: "error", error: "invalid", ...(field ? { field } : {}) };
  }

  return finish(
    await updateUserAccessFor({
      actor: actorOf(access.session),
      targetId: parsed.data.targetId,
      role: parsed.data.role,
      permissions: parsed.data.permissions,
      password: parsed.data.password,
    }),
  );
}

export async function disableUser(_prev: ManageUserState, formData: FormData): Promise<ManageUserState> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = targetSchema.safeParse({ targetId: formData.get("targetId") });
  if (!parsed.success) return { status: "error", error: "invalid" };
  return finish(await disableUserFor({ actor: actorOf(access.session), targetId: parsed.data.targetId }));
}

export async function enableUser(_prev: ManageUserState, formData: FormData): Promise<ManageUserState> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = targetSchema.safeParse({ targetId: formData.get("targetId") });
  if (!parsed.success) return { status: "error", error: "invalid" };
  return finish(await enableUserFor({ actor: actorOf(access.session), targetId: parsed.data.targetId }));
}

export async function deleteUser(_prev: ManageUserState, formData: FormData): Promise<ManageUserState> {
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };
  const parsed = targetSchema.safeParse({ targetId: formData.get("targetId") });
  if (!parsed.success) return { status: "error", error: "invalid" };
  return finish(await deleteUserFor({ actor: actorOf(access.session), targetId: parsed.data.targetId }));
}

function actorOf(session: { userId: string; email: string }) {
  return { userId: session.userId, email: session.email };
}

function finish(result: ManageUserResult): ManageUserState {
  if (!result.ok) return { status: "error", error: result.error };
  revalidatePath("/admin/users");
  return { status: "success" };
}
