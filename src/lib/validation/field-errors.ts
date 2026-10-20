import type { z } from "zod";

/**
 * Shared by every public form schema (message 008, career application 012) and
 * their route handlers — Constitution IV: one schema, never two
 * validation rules that can drift apart.
 */

export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Clean-up for multi-line text (013): line endings become LF, runs of spaces
 * and tabs inside a line collapse to one space, each line is trimmed, and 3 or
 * more consecutive newlines become 2. Line breaks the person typed survive.
 */
export function collapseInlineSpaces(value: string): string {
  return value
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n");
}

/**
 * Flattens a ZodError into `{ field: "message" }`, matching the
 * `400 { error: "validation", fields }` envelope every public route
 * returns.
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
