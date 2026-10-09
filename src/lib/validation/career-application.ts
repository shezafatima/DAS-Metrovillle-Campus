import { z } from "zod";
import { careersCopy } from "@/content/careers";
import { normalisePakistaniMobile } from "@/lib/phone";
import { collapseSpaces } from "@/lib/validation/field-errors";

/**
 * Shared by CareersForm (client-side field messages) and the public route
 * handler (authoritative) — Constitution VI: one schema, never two
 * validation rules that can drift apart. The CV file is checked separately
 * (src/lib/careers/cv-limits.ts) because it is not a text field.
 */
const messages = careersCopy.fieldErrors;

export const careerApplicationFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .transform(collapseSpaces)
    .pipe(z.string().min(2, messages.name).max(100, messages.nameTooLong)),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email(messages.email).max(254, messages.email)),
  phone: z
    .string()
    .trim()
    .transform((value, ctx) => {
      const normalised = normalisePakistaniMobile(value);
      if (normalised === null) {
        ctx.addIssue({ code: "custom", message: messages.phone });
        return z.NEVER;
      }
      return normalised;
    }),
  qualification: z
    .string()
    .trim()
    .transform(collapseSpaces)
    .pipe(z.string().min(2, messages.qualification).max(150, messages.qualificationTooLong)),
  // The browser sends `true`; the multipart request sends the string "true".
  consent: z.union([z.literal(true), z.literal("true")], { error: messages.consent }).transform(() => true as const),
});

export type CareerApplicationFields = z.infer<typeof careerApplicationFieldsSchema>;
