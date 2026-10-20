// @vitest-environment node
import { describe, expect, it } from "vitest";
import { canAccess } from "@/lib/permissions";
import { GROUPS, GROUP_KEYS } from "./registry";
import { PANELS, PANEL_KEYS, SETTINGS_TABS, TAB_KEYS, canSavePanel, getPanel, panelDefinition, panelsOfGroup, visibleTabs } from "./panels";

const user = (permissions: string[], role: "main_admin" | "content_manager" = "content_manager") => ({ role, permissions });

describe("settings panel registry (014, data-model.md invariants)", () => {
  it("every top-level field of every group is in exactly one panel", () => {
    for (const group of GROUP_KEYS) {
      const owners = new Map<string, string[]>();
      for (const panel of panelsOfGroup(group)) {
        if (panel.source.kind !== "group") continue;
        for (const field of panel.source.fields) owners.set(field, [...(owners.get(field) ?? []), panel.key]);
      }
      for (const field of GROUPS[group].fields) {
        expect(owners.get(field.key), `${group}.${field.key}`).toHaveLength(1);
      }
      // ...and no panel names a field the group does not have.
      for (const field of owners.keys()) expect(GROUPS[group].fields.some((f) => f.key === field), `${group}.${field}`).toBe(true);
    }
  });

  it("every panel is in exactly one tab", () => {
    for (const key of PANEL_KEYS) {
      expect(SETTINGS_TABS.filter((tab) => tab.panels.includes(key)), key).toHaveLength(1);
    }
  });

  it("each panel's save permission is admitted by its tab's access", () => {
    for (const tab of SETTINGS_TABS) {
      for (const key of tab.panels) {
        const holder = user([PANELS[key].saveAccess]);
        expect(canAccess(holder, tab.access), `${tab.key} / ${key}`).toBe(true);
      }
    }
  });

  it("panel keys and anchors are unique", () => {
    expect(new Set(PANEL_KEYS).size).toBe(PANEL_KEYS.length);
    const anchors = PANEL_KEYS.map((key) => PANELS[key].anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  it("tabs come in the bar's order, each with its own URL", () => {
    expect(SETTINGS_TABS.map((tab) => tab.key)).toEqual([...TAB_KEYS]);
    expect(SETTINGS_TABS.map((tab) => tab.href)).toEqual(TAB_KEYS.map((key) => `/admin/settings/${key}`));
  });

  it("holds exactly the inventory's panels, in page order", () => {
    const panelsOf = (key: string) => SETTINGS_TABS.find((tab) => tab.key === key)!.panels;
    expect(panelsOf("site-wide")).toEqual(["contact", "portal-links"]);
    expect(panelsOf("home")).toEqual(["hero", "video", "stats"]);
    expect(panelsOf("admission")).toEqual(["admission-window", "admission-messages", "class-levels", "admission-classes"]);
    expect(panelsOf("resources")).toEqual(["photo-gallery"]);
    expect(panelsOf("about")).toEqual([]);
    expect(panelsOf("academics")).toEqual(["syllabi", "examination"]);
    expect(panelsOf("careers")).toEqual([]);
  });

  it("the admission window and classes need Settings; the messages need Pages", () => {
    expect(PANELS["admission-window"].saveAccess).toBe("settings");
    expect(PANELS["admission-classes"].saveAccess).toBe("settings");
    expect(PANELS["admission-messages"].saveAccess).toBe("pages");
    expect(PANELS.contact.saveAccess).toBe("settings");
    // 014b: the footer's Portal links are Settings; the Class Levels table is Pages (ticking which are open stays Settings).
    expect(PANELS["portal-links"].saveAccess).toBe("settings");
    expect(PANELS["class-levels"].saveAccess).toBe("pages");
    // 014b: Syllabi and Examination are page content too.
    for (const key of ["hero", "video", "stats", "photo-gallery", "syllabi", "examination"] as const) expect(PANELS[key].saveAccess).toBe("pages");
  });

  it("getPanel refuses anything that is not a panel key", () => {
    expect(getPanel("hero")?.key).toBe("hero");
    for (const bad of ["", "admission", "gallery", null, undefined, 3, { key: "hero" }]) expect(getPanel(bad)).toBeNull();
  });
});

describe("visibleTabs", () => {
  const keys = (u: ReturnType<typeof user>) => visibleTabs(u).map((tab) => tab.key);

  it("main admin: every tab that has panels", () => {
    expect(keys(user([], "main_admin"))).toEqual(["site-wide", "home", "academics", "admission", "resources"]);
  });
  it("Pages only", () => {
    expect(keys(user(["pages"]))).toEqual(["home", "academics", "admission", "resources"]);
  });
  it("Settings only", () => {
    expect(keys(user(["settings"]))).toEqual(["site-wide", "admission"]);
  });
  it("neither", () => {
    expect(keys(user(["news", "messages", "careers"]))).toEqual([]);
  });
});

describe("canSavePanel", () => {
  it("follows the panel's save permission, main admin always", () => {
    expect(canSavePanel(user(["pages"]), PANELS["admission-window"])).toBe(false);
    expect(canSavePanel(user(["pages"]), PANELS["admission-messages"])).toBe(true);
    expect(canSavePanel(user(["settings"]), PANELS["admission-messages"])).toBe(false);
    expect(canSavePanel(user(["settings"]), PANELS["admission-classes"])).toBe(true);
    expect(canSavePanel(user([], "main_admin"), PANELS["admission-messages"])).toBe(true);
  });
});

describe("panelDefinition", () => {
  it("keeps only the panel's fields, in the group's order", () => {
    expect(panelDefinition(PANELS["admission-messages"]).fields.map((f) => f.key)).toEqual(["announcement", "closedMessage"]);
    expect(panelDefinition(PANELS.hero).fields.map((f) => f.key)).toEqual(GROUPS.hero.fields.map((f) => f.key));
  });

  it("keeps a group rule only in the panel that holds all its fields", () => {
    expect(panelDefinition(PANELS["admission-window"]).rules?.map((r) => r.kind)).toEqual(["dateOrder"]);
    expect(panelDefinition(PANELS["admission-messages"]).rules).toBeUndefined();
    expect(panelDefinition(PANELS["admission-classes"]).rules).toBeUndefined();
  });

  it("returns the same object each time (schemas are cached per definition)", () => {
    expect(panelDefinition(PANELS.stats)).toBe(panelDefinition(PANELS.stats));
  });

  it("throws for the gallery, which has no settings group", () => {
    expect(() => panelDefinition(PANELS["photo-gallery"])).toThrow();
  });
});

describe("014b panels", () => {
  it("each new panel edits its own group, in full", () => {
    expect(PANELS.syllabi.source).toMatchObject({ kind: "group", group: "syllabi", fields: ["levels"] });
    expect(PANELS.examination.source).toMatchObject({ kind: "group", group: "examination", fields: ["blocks"] });
    expect(PANELS["class-levels"].source).toMatchObject({ kind: "group", group: "classLevels", fields: ["ageReferenceDate", "levels"] });
    expect(PANELS["portal-links"].source).toMatchObject({ kind: "group", group: "portalLinks", fields: ["links"] });
  });

  it("the custom editors are named by the panels that need them, and by no other", () => {
    const withEditor = Object.fromEntries(PANEL_KEYS.filter((key) => PANELS[key].editor).map((key) => [key, PANELS[key].editor]));
    expect(withEditor).toEqual({ "admission-classes": "classes-checklist", syllabi: "syllabus" });
  });

  it("View on site points at the public section, and the footer for Portal links", () => {
    expect(PANELS.syllabi.viewOnSite).toBe("/academics#syllabi");
    expect(PANELS.examination.viewOnSite).toBe("/academics#examination");
    expect(PANELS["class-levels"].viewOnSite).toBe("/admission#class-levels");
    expect(PANELS["portal-links"].viewOnSite).toBe("/#site-footer");
  });

  it("the syllabus panel definition carries the group's total-topics rule", () => {
    expect(panelDefinition(PANELS.syllabi).rules?.map((rule) => rule.kind)).toEqual(["maxTotalLines"]);
  });
});
