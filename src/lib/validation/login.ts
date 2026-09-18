import { z } from "zod";

/**
 * Shared by the login Server Action and (per Constitution IV) the
 * client-side form for basic shape checks. Password carries no length
 * rule here deliberately — hinting at the password policy on the login
 * form would help an attacker distinguish input errors from wrong
 * credentials (FR-009).
 */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(1),
  next: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
