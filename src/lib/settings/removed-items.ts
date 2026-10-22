import type { Field, GroupDefinition, GroupValue, ListField } from "./types";

/**
 * Which items a save removed (014b, spec FR-007, research R3). Compares the
 * group's live value before and after a save and returns every list item that
 * was there before and is gone now, matched by `id`, at any depth. Reordering
 * and editing are not removals.
 *
 * A removed item is reported once, at the highest level removed: removing a
 * syllabus level returns that level with its subjects and groups inside
 * `value`, not one entry per child. `path` is where the item sat before the
 * save (`levels.2.subjects.0`), `label` a readable trail ("Class 3 · English"),
 * and `value` its full previous value, so it can be re-entered by hand.
 *
 * Pure, so it is shared by the save path and its tests.
 */
export interface RemovedItem {
  path: string;
  label: string;
  value: Record<string, unknown>;
}

const LABEL_KEYS = ["name", "heading", "label", "title", "alt"] as const;

function labelOf(item: Record<string, unknown>, field: ListField, index: number): string {
  for (const key of LABEL_KEYS) {
    const value = item[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return `${field.itemLabel} ${index + 1}`;
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

const asItems = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object") : [];

/** A plain, detached copy, so the record never aliases the saved value or carries non-JSON values. */
const plain = (value: Record<string, unknown>): Record<string, unknown> => JSON.parse(JSON.stringify(value));

function walk(
  fields: readonly Field[],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix: string,
  trail: readonly string[],
  out: RemovedItem[],
): void {
  for (const field of fields) {
    if (field.type === "group") {
      walk(field.fields, asRecord(before[field.key]), asRecord(after[field.key]), `${prefix}${field.key}.`, trail, out);
      continue;
    }
    if (field.type !== "list") continue;

    const beforeItems = asItems(before[field.key]);
    const afterById = new Map(asItems(after[field.key]).map((item) => [String(item.id), item]));
    beforeItems.forEach((item, index) => {
      const label = [...trail, labelOf(item, field, index)];
      const kept = afterById.get(String(item.id));
      if (!kept) {
        out.push({ path: `${prefix}${field.key}.${index}`, label: label.join(" · "), value: plain(item) });
        return;
      }
      walk(field.itemFields, item, kept, `${prefix}${field.key}.${index}.`, label, out);
    });
  }
}

export function removedItems(def: GroupDefinition, beforeLive: GroupValue, afterLive: GroupValue): RemovedItem[] {
  const out: RemovedItem[] = [];
  walk(def.fields, beforeLive, afterLive, "", [], out);
  return out;
}
