import { z } from "zod";
import { normalisePakistaniMobile } from "@/lib/signup/phone";
import { SIGNUP_SOURCE_KEYS } from "@/lib/signup/sources";

/**
 * Shared by the public SignupForm (client-side field messages) and the
 * public route handler (authoritative) — Constitution IV: one schema,
 * never two validation rules that can drift apart.
 *
 * Output shape (SignupInput) already has the natural key normalised
 * (email lower-cased/trimmed, phone in E.164) — ADR-0001's identity
 * rule depends on every caller seeing the same normalised value.
 */

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

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

/**
 * Flattens a ZodError into `{ field: "message" }`, matching the
 * `400 { error: "validation", fields }` envelope the public route
 * returns (contracts/public-signup-api.md).
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
