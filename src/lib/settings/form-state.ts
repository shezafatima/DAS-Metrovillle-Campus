import { defaultForField } from "./defaults";
import type { ListField } from "./types";

/**
 * Small pure helpers for the generated settings form (client and tests).
 * Paths are dotted like the server's field errors: `slides.1.alt`.
 */

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((value, index) => deepEqual(value, b[index]));
  }
  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;
  const keys = Object.keys(left);
  if (keys.length !== Object.keys(right).length) return false;
  return keys.every((key) => Object.hasOwn(right, key) && deepEqual(left[key], right[key]));
}

/** A copy of `value` with `next` written at `path` (objects and arrays are copied on the way down). */
export function setAtPath(value: unknown, path: (string | number)[], next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path;
  if (Array.isArray(value)) {
    const copy = [...value];
    copy[head as number] = setAtPath(copy[head as number], rest, next);
    return copy;
  }
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return { ...record, [head]: setAtPath(record[head as string], rest, next) };
}

/** A blank item for a list: a fresh id plus each item field's default. */
export function newItem(field: ListField): Record<string, unknown> {
  const item: Record<string, unknown> = { id: crypto.randomUUID() };
  for (const child of field.itemFields) item[child.key] = defaultForField(child);
  return item;
}

/** The error entries that belong to one list item, with the item prefix removed: `slides.1.alt` → `alt`. */
export function itemErrors(errors: Record<string, string>, listPath: string, index: number): Record<string, string> {
  const prefix = `${listPath}.${index}.`;
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = message;
  }
  return out;
}

/** Errors without the entries at or under `path` (used when the admin edits that field). */
export function withoutErrorsUnder(errors: Record<string, string>, path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key !== path && !key.startsWith(`${path}.`)) out[key] = message;
  }
  return out;
}
