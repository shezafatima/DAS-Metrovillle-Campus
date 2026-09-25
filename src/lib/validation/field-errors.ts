import type { z } from "zod";

/**
 * Shared by every public form schema (signup 004, message 008) and
 * their route handlers — Constitution IV: one schema, never two
 * validation rules that can drift apart.
 */

export function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
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
