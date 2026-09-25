import { z } from "zod";
import { normalisePakistaniMobile } from "@/lib/phone";
import { collapseSpaces } from "@/lib/validation/field-errors";
import { MESSAGE_STATUS_KEYS } from "@/lib/messages/statuses";

/**
 * Shared by ContactForm (client-side field messages) and the public
 * route handler (authoritative) — Constitution IV: one schema, never
 * two validation rules that can drift apart.
 */

export const MESSAGE_MAX_LENGTH = 5000;

export const messageInputSchema = z.object({
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
    .optional()
    .transform((value, ctx) => {
      const trimmed = value?.trim() ?? "";
      if (trimmed === "") return null;
      const normalised = normalisePakistaniMobile(trimmed);
      if (normalised === null) {
        ctx.addIssue({ code: "custom", message: "Enter a Pakistani mobile number, e.g. 03001234567." });
        return z.NEVER;
      }
      return normalised;
    }),
  subject: z
    .string()
    .trim()
    .transform(collapseSpaces)
    .pipe(z.string().min(1, "Subject is required.").max(150, "Subject must be 150 characters or fewer.")),
  message: z
    .string()
    .transform((v) => v.replace(/\r\n?/g, "\n"))
    .pipe(
      z
        .string()
        .trim()
        .min(1, "Message is required.")
        .max(MESSAGE_MAX_LENGTH, "Message must be 5,000 characters or fewer."),
    ),
});

export type MessageInput = z.infer<typeof messageInputSchema>;

export const messageStatusUpdateSchema = z.object({
  status: z.enum(MESSAGE_STATUS_KEYS, { error: "Choose New, Read or Responded." }),
});
