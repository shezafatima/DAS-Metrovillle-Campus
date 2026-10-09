// @vitest-environment node
import { describe, expect, it } from "vitest";
import { deepEqual, itemErrors, newItem, setAtPath, withoutErrorsUnder } from "./form-state";
import { heroDefinition } from "./groups/hero";
import type { ListField } from "./types";

describe("deepEqual", () => {
  it("compares nested values regardless of key order", () => {
    expect(deepEqual({ a: 1, b: [1, { c: 2 }] }, { b: [1, { c: 2 }], a: 1 })).toBe(true);
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual([1, 2], [2, 1])).toBe(false);
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual([], {})).toBe(false);
  });
});

describe("setAtPath", () => {
  it("writes into nested objects and arrays without mutating the original", () => {
    const original = { social: { fb: "" }, slides: [{ alt: "a" }, { alt: "b" }] };
    const next = setAtPath(original, ["slides", 1, "alt"], "B") as typeof original;
    expect(next.slides[1].alt).toBe("B");
    expect(original.slides[1].alt).toBe("b");
    expect(next.slides[0]).toBe(original.slides[0]);
    expect((setAtPath(original, ["social", "fb"], "x") as typeof original).social.fb).toBe("x");
  });
});

describe("newItem", () => {
  it("has a fresh UUID and every item field's default", () => {
    const list = heroDefinition.fields.find((f) => f.type === "list") as ListField;
    const a = newItem(list);
    const b = newItem(list);
    expect(a.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.id).not.toBe(b.id);
    expect(a).toMatchObject({ desktop: null, mobile: null, alt: "", heading: "", visible: true });
  });
});

describe("error helpers", () => {
  const errors = { slides: "list", "slides.0.alt": "a0", "slides.1.alt": "a1", "slides.1.buttonLabel": "pair", phone: "p" };

  it("picks one item's errors and strips the prefix", () => {
    expect(itemErrors(errors, "slides", 1)).toEqual({ alt: "a1", buttonLabel: "pair" });
    expect(itemErrors(errors, "slides", 2)).toEqual({});
  });

  it("drops errors at and under a path", () => {
    expect(withoutErrorsUnder(errors, "slides.1")).toEqual({ slides: "list", "slides.0.alt": "a0", phone: "p" });
    expect(withoutErrorsUnder(errors, "slides")).toEqual({ phone: "p" });
  });
});
