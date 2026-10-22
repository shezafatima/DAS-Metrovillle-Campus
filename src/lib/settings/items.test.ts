// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { MAX_DELETED_RETAINED, liveItems, moveItem, reconcileGroupValue, reconcileItems, toLiveValue } from "./items";
import type { GroupDefinition, ListItem } from "./types";

function live(title: string, id = randomUUID()): ListItem {
  return { id, deletedAt: null, title };
}
function gone(title: string, at: Date, id = randomUUID()): ListItem {
  return { id, deletedAt: at, title };
}

describe("liveItems", () => {
  it("drops deleted items and keeps order", () => {
    const a = live("a");
    const c = live("c");
    expect(liveItems([a, gone("b", new Date()), c])).toEqual([a, c]);
  });
});

describe("moveItem", () => {
  const list = ["a", "b", "c", "d"];

  it("moves an item up and down", () => {
    expect(moveItem(list, 2, 1)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(list, 1, 2)).toEqual(["a", "c", "b", "d"]);
  });

  it("moves to first and last", () => {
    expect(moveItem(list, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveItem(list, 0, 3)).toEqual(["b", "c", "d", "a"]);
  });

  it("returns the same order for a no-op or out-of-range move", () => {
    expect(moveItem(list, 1, 1)).toEqual(list);
    expect(moveItem(list, -1, 2)).toEqual(list);
    expect(moveItem(list, 0, 9)).toEqual(list);
  });

  it("does not mutate its input", () => {
    const copy = [...list];
    moveItem(list, 0, 3);
    expect(list).toEqual(copy);
  });
});

describe("reconcileItems", () => {
  const now = new Date("2026-09-30T10:00:00Z");
  const earlier = new Date("2026-09-01T10:00:00Z");

  it("keeps incoming items live, in incoming order", () => {
    const a = live("a");
    const b = live("b");
    const result = reconcileItems([a, b], [b, a], now);
    expect(result.ok && result.items.map((i) => i.title)).toEqual(["b", "a"]);
    expect(result.ok && result.items.every((i) => i.deletedAt === null)).toBe(true);
  });

  it("marks a stored live item that is absent from the payload as deleted now", () => {
    const a = live("a");
    const b = live("b");
    const result = reconcileItems([a, b], [a], now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0]).toMatchObject({ id: a.id, deletedAt: null });
    expect(result.items[1]).toMatchObject({ id: b.id, deletedAt: now });
  });

  it("keeps previously deleted items after the live ones", () => {
    const a = live("a");
    const old = gone("old", earlier);
    const result = reconcileItems([old, a], [a], now);
    expect(result.ok && result.items.map((i) => i.title)).toEqual(["a", "old"]);
    expect(result.ok && result.items[1].deletedAt).toEqual(earlier);
  });

  it("accepts new items with fresh ids", () => {
    const fresh = live("new");
    const result = reconcileItems([], [fresh], now);
    expect(result.ok && result.items).toHaveLength(1);
  });

  it("refuses an incoming id that matches a stored deleted item (no resurrection)", () => {
    const old = gone("old", earlier);
    const result = reconcileItems([old], [live("old", old.id)], now);
    expect(result).toEqual({ ok: false });
  });

  it("refuses duplicate incoming ids", () => {
    const id = randomUUID();
    expect(reconcileItems([], [live("a", id), live("b", id)], now)).toEqual({ ok: false });
  });

  it("caps retained deleted items, dropping the oldest", () => {
    const many = Array.from({ length: MAX_DELETED_RETAINED + 3 }, (_, n) => gone(`d${n}`, new Date(2026, 0, 1, 0, n)));
    const keep = live("keep");
    const result = reconcileItems([keep, ...many], [keep], now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const deleted = result.items.filter((i) => i.deletedAt);
    expect(deleted).toHaveLength(MAX_DELETED_RETAINED);
    expect(deleted.some((i) => i.title === "d0")).toBe(false);
    expect(deleted.some((i) => i.title === `d${MAX_DELETED_RETAINED + 2}`)).toBe(true);
  });
});

const now = new Date("2026-09-30T10:00:00Z");

describe("a per-list cap on retained deleted items (014b)", () => {
  it("reconcileItems keeps only the newest `maxDeleted` removed items when given one", () => {
    const many = Array.from({ length: 13 }, (_, n) => gone(`d${n}`, new Date(2026, 0, 1, 0, n)));
    const keep = live("keep");
    const result = reconcileItems([keep, ...many], [keep], now, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const deleted = result.items.filter((i) => i.deletedAt).map((i) => i.title);
    expect(deleted).toHaveLength(10);
    expect(deleted).not.toContain("d0");
    expect(deleted).toContain("d12");
  });

  it("reconcileGroupValue uses the list's own maxDeletedRetained", () => {
    const def: GroupDefinition = {
      key: "syllabi",
      label: "Test",
      fields: [{ type: "list", key: "levels", label: "Levels", itemLabel: "level", maxItems: 20, maxDeletedRetained: 2, itemFields: [{ type: "text", key: "title", label: "T", maxLength: 10 }] }],
    } as unknown as GroupDefinition;
    const stored = { levels: [live("keep"), gone("d0", new Date(2026, 0, 1, 0, 0)), gone("d1", new Date(2026, 0, 1, 0, 1)), gone("d2", new Date(2026, 0, 1, 0, 2))] };
    const result = reconcileGroupValue(def, stored, { levels: [stored.levels[0]] }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect((result.data.levels as ListItem[]).filter((i) => i.deletedAt).map((i) => i.title)).toEqual(["d1", "d2"]);
  });

  it("a removed top-level item keeps everything under it, while a removed nested item is simply absent from what is stored", () => {
    const def: GroupDefinition = {
      key: "syllabi",
      label: "Test",
      fields: [
        {
          type: "list",
          key: "levels",
          label: "Levels",
          itemLabel: "level",
          maxItems: 20,
          itemFields: [
            { type: "text", key: "title", label: "T", maxLength: 10 },
            { type: "list", key: "subjects", label: "S", itemLabel: "subject", maxItems: 5, itemFields: [{ type: "text", key: "title", label: "T", maxLength: 10 }] },
          ],
        },
      ],
    } as unknown as GroupDefinition;
    const level = (title: string, ...subjects: string[]) => ({ id: randomUUID(), deletedAt: null, title, subjects: subjects.map((t) => ({ id: randomUUID(), deletedAt: null, title: t })) });
    const a = level("A", "a1", "a2");
    const b = level("B", "b1");
    const result = reconcileGroupValue(def, { levels: [a, b] }, { levels: [{ ...a, subjects: [a.subjects[0]] }] }, now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [kept, removed] = result.data.levels as (ListItem & { subjects: unknown[] })[];
    expect(kept.subjects).toHaveLength(1);
    expect(removed).toMatchObject({ title: "B", deletedAt: now });
    expect(removed.subjects).toHaveLength(1);
  });
});

describe("toLiveValue with lists nested in items (014b)", () => {
  const def = {
    key: "syllabi",
    label: "Test",
    fields: [
      {
        type: "list",
        key: "levels",
        label: "Levels",
        itemLabel: "level",
        maxItems: 20,
        itemFields: [
          { type: "text", key: "name", label: "N", maxLength: 10 },
          { type: "list", key: "subjects", label: "S", itemLabel: "subject", maxItems: 5, itemFields: [{ type: "text", key: "name", label: "N", maxLength: 10 }] },
        ],
      },
    ],
  } as unknown as GroupDefinition;

  it("drops removed levels and the deletedAt marker at every depth", () => {
    const data = {
      levels: [
        { id: "l1", deletedAt: null, name: "One", subjects: [{ id: "s1", deletedAt: null, name: "Eng" }] },
        { id: "l2", deletedAt: new Date(), name: "Gone", subjects: [] },
      ],
    };
    expect(toLiveValue(def, data)).toEqual({ levels: [{ id: "l1", name: "One", subjects: [{ id: "s1", name: "Eng" }] }] });
  });

  it("leaves an item with no nested list as it is", () => {
    expect(toLiveValue(def, { levels: [{ id: "l1", deletedAt: null, name: "One" }] })).toEqual({ levels: [{ id: "l1", name: "One" }] });
  });
});
