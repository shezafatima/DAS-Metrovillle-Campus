import { describe, expect, it } from "vitest";
import { teamPlaceholders } from "@/content/about/management-team";
import { aboutNavChildren, aboutView, showTeamPlaceholders, valuesColumns } from "./view";

const ids = (v: ReturnType<typeof aboutView>) => v.sections.map((s) => s.id);
const bgs = (v: ReturnType<typeof aboutView>) => v.sections.map((s) => s.background);
const member = { id: "m-1", name: "A", designation: "B", description: "C", photo: null };

describe("aboutView", () => {
  it("hides the team in production", () => {
    const v = aboutView({ members: [], messageCount: 3, showPlaceholders: false });
    expect(ids(v)).toEqual(["our-story", "vision-mission", "core-values", "messages"]);
    expect(bgs(v)).toEqual(["surface", "navy", "muted", "surface"]);
    expect(v.teamCards).toEqual([]);
  });

  it("shows all five sections and 3 placeholders in development", () => {
    const v = aboutView({ members: [], messageCount: 3, showPlaceholders: true });
    expect(ids(v)).toHaveLength(5);
    expect(bgs(v)).toEqual(["surface", "navy", "muted", "surface", "muted"]);
    expect(v.teamCards).toHaveLength(3);
    expect(v.teamCards.every((c) => c.placeholder)).toBe(true);
    expect(teamPlaceholders).toHaveLength(3);
  });

  it("hides Messages when it is empty, in every mode", () => {
    const dev = aboutView({ members: [], messageCount: 0, showPlaceholders: true });
    expect(ids(dev)).toEqual(["our-story", "vision-mission", "core-values", "management-team"]);
    expect(bgs(dev)).toEqual(["surface", "navy", "muted", "surface"]);
    const prod = aboutView({ members: [], messageCount: 0, showPlaceholders: false });
    expect(ids(prod)).toEqual(["our-story", "vision-mission", "core-values"]);
  });

  it("shows real members even when placeholders are off", () => {
    const v = aboutView({ members: [member], messageCount: 1, showPlaceholders: false });
    expect(ids(v)).toContain("management-team");
    expect(v.teamCards).toEqual([{ ...member, placeholder: false }]);
  });
});

describe("valuesColumns", () => {
  it.each([
    [3, 3],
    [6, 3],
    [9, 3],
    [12, 3],
    [4, 4],
    [7, 4],
    [8, 4],
  ])("%i values → %i columns", (n, cols) => {
    expect(valuesColumns(n)).toBe(cols);
  });
});

describe("aboutNavChildren", () => {
  it("lists the visible sections in order", () => {
    const v = aboutView({ members: [], messageCount: 3, showPlaceholders: false });
    expect(aboutNavChildren(v)).toEqual([
      { label: "Our Story", href: "/about#our-story" },
      { label: "Vision & Mission", href: "/about#vision-mission" },
      { label: "Core Values", href: "/about#core-values" },
      { label: "Messages", href: "/about#messages" },
    ]);
  });
});

describe("showTeamPlaceholders", () => {
  it("is true only in development without the production seam", () => {
    expect(showTeamPlaceholders({ nodeEnv: "development", forceProduction: false })).toBe(true);
    expect(showTeamPlaceholders({ nodeEnv: "production", forceProduction: false })).toBe(false);
    expect(showTeamPlaceholders({ nodeEnv: "development", forceProduction: true })).toBe(false);
    expect(showTeamPlaceholders({ nodeEnv: "test", forceProduction: false })).toBe(false);
  });
});
