import { z } from "zod";

/**
 * Change-password rules (010 FR-008), shared by the Account page's
 * Server Action and its client form (Constitution VI) so the two can't
 * drift. Better Auth still enforces the length rules and verifies the
 * current password on the server; this adds what it doesn't check —
 * the confirmation and "different from current".
 *
 * Passwords are compared exactly as typed: no trimming, no case folding.
 */
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
  confirmPassword: z.string().min(1),
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type ChangePasswordErrorKey = "invalid" | "too_short" | "too_long" | "mismatch" | "same_as_current";

/** Returns the first failing rule, in the order the contract fixes, or null. */
export function validateChangePassword(input: unknown): ChangePasswordErrorKey | null {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return "invalid";

  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword.length < PASSWORD_MIN_LENGTH) return "too_short";
  if (newPassword.length > PASSWORD_MAX_LENGTH) return "too_long";
  if (confirmPassword !== newPassword) return "mismatch";
  if (newPassword === currentPassword) return "same_as_current";
  return null;
}
