import { z } from "zod";
import { normalisePakistaniMobile } from "@/lib/signup/phone";
import { SIGNUP_SOURCE_KEYS } from "@/lib/signup/sources";
import { collapseSpaces } from "@/lib/validation/field-errors";

/**
 * Shared by the public SignupForm (client-side field messages) and the
 * public route handler (authoritative) — Constitution IV: one schema,
 * never two validation rules that can drift apart.
 *
 * Output shape (SignupInput) already has the natural key normalised
 * (email lower-cased/trimmed, phone in E.164) — ADR-0001's identity
 * rule depends on every caller seeing the same normalised value.
 */

export const signupInputSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(collapseSpaces)
    .pipe(z.string().min(1, "Name is required.").max(100, "Name must be 100 characters or fewer.")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254, "Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalised = normalisePakistaniMobile(value);
      if (normalised === null) {
        ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 03001234567." });
        return z.NEVER;
      }
      return normalised;
    }),
  source: z.enum(SIGNUP_SOURCE_KEYS, { error: "Unknown page." }),
});

export type SignupInput = z.infer<typeof signupInputSchema>;

export { fieldErrors } from "@/lib/validation/field-errors";
