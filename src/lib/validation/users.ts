import { z } from "zod";
import { PERMISSION_KEYS } from "@/lib/permissions";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation/account";

/**
 * User-management input (011), shared by the user panel and the Server
 * Actions so the two cannot drift (Constitution VI). The server runs it
 * again regardless of what the panel checked.
 *
 * `permissions` accepts only the five grantable keys: "main_admin",
 * "users" and "registrations" are rejected here, so they can never be
 * stored as a grant (FR-004). The password the admin types or generates
 * is controlled by the main admin, and must meet the same length rules as any
 * other password: 12 to 128 characters (FR-021). Emails are trimmed and
 * lowercased: the same email cannot belong to two accounts (FR-020).
 */
export const EMAIL_MAX_LENGTH = 254;

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(EMAIL_MAX_LENGTH)
  .pipe(z.email());

/** A password set by the admin: the same length rules as everywhere else (010 FR-008), compared exactly as typed. */
export const adminSetPasswordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);

const roleSchema = z.enum(["main_admin", "content_manager"]);
const permissionsSchema = z.array(z.enum(PERMISSION_KEYS));

export const createUserSchema = z.object({
  email: emailSchema,
  role: roleSchema.default("content_manager"),
  permissions: permissionsSchema.default([]),
  password: adminSetPasswordSchema,
});

export const updateUserAccessSchema = z.object({
  targetId: z.string().min(1),
  role: roleSchema,
  permissions: permissionsSchema,
  /** Optional: when present, the user's password is set to it and their sessions end. */
  password: adminSetPasswordSchema.optional(),
});

export const targetSchema = z.object({ targetId: z.string().min(1) });

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserAccessInput = z.infer<typeof updateUserAccessSchema>;

/** Every result key an action can return (contracts/user-actions.md). */
export type UserActionErrorKey =
  | "unauthorized"
  | "forbidden"
  | "invalid"
  | "email_taken"
  | "self"
  | "last_main_admin"
  | "not_found"
  | "unavailable";

/** The field a validation failure belongs to, so the panel can point at it. */
export type UserFormField = "email" | "password";

export function failedField(error: z.ZodError): UserFormField | undefined {
  const first = error.issues[0]?.path[0];
  return first === "email" || first === "password" ? first : undefined;
}

/**
 * Repeated `permissions` form fields become the list (none ticked → []).
 * An empty password field means "not setting one" (on edit), never an
 * empty password.
 */
export function readUserForm(formData: FormData): {
  email: unknown;
  role: unknown;
  permissions: string[];
  targetId: unknown;
  password: unknown;
} {
  const password = formData.get("password");
  return {
    email: formData.get("email"),
    role: formData.get("role") ?? undefined,
    permissions: formData.getAll("permissions").map(String),
    targetId: formData.get("targetId"),
    password: password === "" ? undefined : (password ?? undefined),
  };
}
