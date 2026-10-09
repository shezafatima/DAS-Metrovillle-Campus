// @vitest-environment node
import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { MAX_DELETED_RETAINED, liveItems, moveItem, reconcileItems } from "./items";
import type { ListItem } from "./types";

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
