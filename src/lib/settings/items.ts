import type { GroupDefinition, GroupValue, ListItem } from "./types";

/**
 * List-item helpers for Settings (005): live/deleted filtering, reordering,
 * and the soft-delete reconciliation a save performs (research R3).
 */

/** Deleted items kept per list; the oldest are dropped past this so a document cannot grow without limit. */
export const MAX_DELETED_RETAINED = 500;

export function liveItems<T extends { deletedAt?: Date | string | null }>(items: readonly T[]): T[] {
  return items.filter((item) => !item.deletedAt);
}

/** A new array with the item at `from` moved to `to`. An out-of-range or no-op move returns the same order. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const copy = [...list];
  const inRange = (n: number) => Number.isInteger(n) && n >= 0 && n < copy.length;
  if (!inRange(from) || !inRange(to) || from === to) return copy;
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

export type ReconcileResult = { ok: true; items: ListItem[] } | { ok: false };

function asDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

/**
 * Combines what is stored with what the admin sent (live items only):
 *  - every incoming item is live, in the incoming order;
 *  - a stored live item missing from the payload becomes deleted now;
 *  - previously deleted items are kept, after the live ones;
 *  - an incoming id that matches a stored DELETED item is refused (a save
 *    cannot resurrect an item), as are duplicate incoming ids.
 */
export function reconcileItems(stored: readonly ListItem[], incoming: readonly ListItem[], now: Date): ReconcileResult {
  const storedById = new Map(stored.map((item) => [item.id, item]));
  const seen = new Set<string>();

  for (const item of incoming) {
    if (seen.has(item.id)) return { ok: false };
    seen.add(item.id);
    const existing = storedById.get(item.id);
    if (existing && existing.deletedAt) return { ok: false };
  }

  const live = incoming.map((item) => ({ ...item, deletedAt: null }));

  const previouslyDeleted = stored.filter((item) => item.deletedAt).map((item) => ({ ...item, deletedAt: asDate(item.deletedAt) }));
  const newlyDeleted = stored
    .filter((item) => !item.deletedAt && !seen.has(item.id))
    .map((item) => ({ ...item, deletedAt: now }));

  let deleted = [...previouslyDeleted, ...newlyDeleted];
  if (deleted.length > MAX_DELETED_RETAINED) {
    const excess = deleted.length - MAX_DELETED_RETAINED;
    const oldest = new Set(
      [...deleted]
        .sort((a, b) => (a.deletedAt?.getTime() ?? 0) - (b.deletedAt?.getTime() ?? 0))
        .slice(0, excess),
    );
    deleted = deleted.filter((item) => !oldest.has(item));
  }

  return { ok: true, items: [...live, ...deleted] };
}

/**
 * Applies `reconcileItems` to every top-level list field of a group.
 * Returns the stored shape (live items first, deleted items after) or the
 * key of the list that was refused.
 */
export function reconcileGroupValue(
  def: GroupDefinition,
  stored: GroupValue | null,
  incoming: GroupValue,
  now: Date,
): { ok: true; data: GroupValue } | { ok: false; field: string } {
  const data: GroupValue = { ...incoming };
  for (const field of def.fields) {
    if (field.type !== "list") continue;
    const storedItems = Array.isArray(stored?.[field.key]) ? (stored![field.key] as ListItem[]) : [];
    const incomingItems = Array.isArray(incoming[field.key]) ? (incoming[field.key] as ListItem[]) : [];
    const result = reconcileItems(storedItems, incomingItems, now);
    if (!result.ok) return { ok: false, field: field.key };
    data[field.key] = result.items;
  }
  return { ok: true, data };
}

/** A stored group value as the admin and the site see it: list items live only, without the `deletedAt` marker. */
export function toLiveValue(def: GroupDefinition, data: GroupValue): GroupValue {
  const out: GroupValue = { ...data };
  for (const field of def.fields) {
    if (field.type !== "list") continue;
    const items = Array.isArray(data[field.key]) ? (data[field.key] as ListItem[]) : [];
    out[field.key] = liveItems(items).map((item) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { deletedAt, ...rest } = item;
      return rest;
    });
  }
  return out;
}
