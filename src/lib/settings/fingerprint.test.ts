// @vitest-environment node
import { describe, expect, it } from "vitest";
import { FINGERPRINT_PATTERN, panelFingerprint } from "./fingerprint";

describe("panelFingerprint (014 research R4)", () => {
  const value = {
    announcement: "Open for Class 1",
    closedMessage: "Opening soon",
    classes: [
      { id: "a", name: "Playgroup" },
      { id: "b", name: "Class 1" },
    ],
    opensOn: "2026-11-01",
  };

  it("is 32 lowercase hex characters", () => {
    expect(panelFingerprint(["announcement"], value)).toMatch(FINGERPRINT_PATTERN);
  });

  it("does not depend on key order, at any depth", () => {
    const reordered = {
      opensOn: "2026-11-01",
      classes: [
        { name: "Playgroup", id: "a" },
        { name: "Class 1", id: "b" },
      ],
      closedMessage: "Opening soon",
      announcement: "Open for Class 1",
    };
    const fields = ["announcement", "closedMessage", "classes"];
    expect(panelFingerprint(fields, reordered)).toBe(panelFingerprint(fields, value));
  });

  it("changes when a field, a list item or an item id changes", () => {
    const base = panelFingerprint(["announcement", "classes"], value);
    expect(panelFingerprint(["announcement", "classes"], { ...value, announcement: "Open!" })).not.toBe(base);
    expect(panelFingerprint(["announcement", "classes"], { ...value, classes: [value.classes[0]] })).not.toBe(base);
    expect(panelFingerprint(["announcement", "classes"], { ...value, classes: [value.classes[1], value.classes[0]] })).not.toBe(base);
    expect(
      panelFingerprint(["announcement", "classes"], { ...value, classes: [{ id: "z", name: "Playgroup" }, value.classes[1]] }),
    ).not.toBe(base);
  });

  it("depends only on the panel's own fields", () => {
    const fields = ["announcement", "closedMessage"];
    const base = panelFingerprint(fields, value);
    expect(panelFingerprint(fields, { ...value, opensOn: "2027-01-01", classes: [] })).toBe(base);
  });

  it("treats a missing field like null, and differs from an empty string", () => {
    expect(panelFingerprint(["opensOn"], {})).toBe(panelFingerprint(["opensOn"], { opensOn: null }));
    expect(panelFingerprint(["opensOn"], {})).not.toBe(panelFingerprint(["opensOn"], { opensOn: "" }));
  });
});
