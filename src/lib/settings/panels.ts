import { settingsCopy } from "@/content/admin";
import { canAccess, type Access, type Role } from "@/lib/permissions";
import { GROUPS } from "./registry";
import type { GroupDefinition, GroupKey } from "./types";

/**
 * Settings by page (014, contracts/tabs-and-panels.md, ADR-0013). Settings
 * is one tab per public page plus Site-wide; each tab shows panels, in the
 * public page's order. A panel edits an existing 005 group, or part of one
 * (the admission group's three panels), or the 007 album list. Nothing here
 * is stored: the groups keep their records, and a panel is a filtered view
 * of a group definition.
 *
 * Pure and free of server imports, so the admin form (client) and the save
 * actions (server) share one description of every panel (Constitution VI).
 */

export const TAB_KEYS = ["site-wide", "home", "about", "academics", "admission", "resources", "careers"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const PANEL_KEYS = [
  "contact",
  "hero",
  "video",
  "stats",
  "admission-window",
  "admission-messages",
  "admission-classes",
  "photo-gallery",
] as const;
export type PanelKey = (typeof PANEL_KEYS)[number];

/** The permission a panel's save needs. Its tab's view access must admit it. */
export type SaveAccess = "settings" | "pages";

export type PanelSource = { kind: "group"; group: GroupKey; fields: readonly string[] } | { kind: "gallery" };

export interface SettingsPanel {
  key: PanelKey;
  /** The public section's name. */
  title: string;
  /** The admin fragment id (`/admin/settings/home#hero`); unique within its tab. */
  anchor: string;
  /** Where "View on site" goes. */
  viewOnSite: string;
  saveAccess: SaveAccess;
  source: PanelSource;
}

export interface SettingsTab {
  key: TabKey;
  label: string;
  href: string;
  /** Who may open the tab. A panel the user may open but not save is shown read-only. */
  access: Access;
  /** In public page order. A tab with none is hidden and has no route. */
  panels: readonly PanelKey[];
}

const allFields = (group: GroupKey) => GROUPS[group].fields.map((field) => field.key);
const titles = settingsCopy.panels;

export const PANELS: Record<PanelKey, SettingsPanel> = {
  contact: {
    key: "contact",
    title: titles.contact,
    anchor: "contact",
    viewOnSite: "/contact",
    saveAccess: "settings",
    source: { kind: "group", group: "contact", fields: allFields("contact") },
  },
  hero: {
    key: "hero",
    title: titles.hero,
    anchor: "hero",
    viewOnSite: "/#hero",
    saveAccess: "pages",
    source: { kind: "group", group: "hero", fields: allFields("hero") },
  },
  video: {
    key: "video",
    title: titles.video,
    anchor: "video",
    viewOnSite: "/#why-choose",
    saveAccess: "pages",
    source: { kind: "group", group: "video", fields: allFields("video") },
  },
  stats: {
    key: "stats",
    title: titles.stats,
    anchor: "stats",
    viewOnSite: "/#progress-dashboard",
    saveAccess: "pages",
    source: { kind: "group", group: "stats", fields: allFields("stats") },
  },
  // The window and the class list decide whether parents can register, so
  // they stay under Settings (spec Q2); the messages are page text (Pages).
  "admission-window": {
    key: "admission-window",
    title: titles["admission-window"],
    anchor: "admission-window",
    viewOnSite: "/admission#admission-procedure",
    saveAccess: "settings",
    source: { kind: "group", group: "admission", fields: ["opensOn", "closesOn"] },
  },
  "admission-messages": {
    key: "admission-messages",
    title: titles["admission-messages"],
    anchor: "admission-messages",
    viewOnSite: "/admission#admission-procedure",
    saveAccess: "pages",
    source: { kind: "group", group: "admission", fields: ["announcement", "closedMessage"] },
  },
  "admission-classes": {
    key: "admission-classes",
    title: titles["admission-classes"],
    anchor: "admission-classes",
    viewOnSite: "/admission/register",
    saveAccess: "settings",
    source: { kind: "group", group: "admission", fields: ["classes"] },
  },
  "photo-gallery": {
    key: "photo-gallery",
    title: titles["photo-gallery"],
    anchor: "photo-gallery",
    viewOnSite: "/resources#photo-gallery",
    saveAccess: "pages",
    source: { kind: "gallery" },
  },
};

const tab = (key: TabKey, access: Access, panels: readonly PanelKey[]): SettingsTab => ({
  key,
  label: settingsCopy.tabs[key],
  href: `/admin/settings/${key}`,
  access,
  panels,
});

/** The tab bar's order. About, Academics and Careers get panels in 014 slices 2–3. */
export const SETTINGS_TABS: readonly SettingsTab[] = [
  tab("site-wide", "settings", ["contact"]),
  tab("home", "pages", ["hero", "video", "stats"]),
  tab("about", "pages", []),
  tab("academics", "pages", []),
  // Opens for either permission (spec Q1); each panel enforces its own.
  tab("admission", "settings_or_pages", ["admission-window", "admission-messages", "admission-classes"]),
  tab("resources", "pages", ["photo-gallery"]),
  tab("careers", "pages", []),
];

type AccessUser = { role: Role; permissions: readonly string[] };

export function isPanelKey(value: unknown): value is PanelKey {
  return typeof value === "string" && (PANEL_KEYS as readonly string[]).includes(value);
}

/** The panel for a key, or null for anything that is not a known panel. */
export function getPanel(key: unknown): SettingsPanel | null {
  return isPanelKey(key) ? PANELS[key] : null;
}

/** The tabs this user sees: those with at least one panel that they may open. Presentation only. */
export function visibleTabs(user: AccessUser): SettingsTab[] {
  return SETTINGS_TABS.filter((entry) => entry.panels.length > 0 && canAccess(user, entry.access));
}

export function canSavePanel(user: AccessUser, panel: SettingsPanel): boolean {
  return canAccess(user, panel.saveAccess);
}

const definitionCache = new Map<PanelKey, GroupDefinition>();

/**
 * The group definition a panel edits: only the panel's fields, and only the
 * group rules whose fields are all inside it (the admission `dateOrder` rule
 * belongs to the Admission window panel). Cached, so `schemaFor` (which
 * caches per definition object) builds each panel schema once.
 */
export function panelDefinition(panel: SettingsPanel): GroupDefinition {
  if (panel.source.kind !== "group") throw new Error(`Panel ${panel.key} has no settings group`);
  const cached = definitionCache.get(panel.key);
  if (cached) return cached;
  const group = GROUPS[panel.source.group];
  const keys = new Set(panel.source.fields);
  const rules = (group.rules ?? []).filter((rule) => keys.has(rule.from) && keys.has(rule.to));
  const def: GroupDefinition = {
    key: group.key,
    label: panel.title,
    fields: group.fields.filter((field) => keys.has(field.key)),
    ...(rules.length > 0 ? { rules } : {}),
  };
  definitionCache.set(panel.key, def);
  return def;
}

/** The panels that edit a group, in registry order. */
export function panelsOfGroup(group: GroupKey): SettingsPanel[] {
  return PANEL_KEYS.map((key) => PANELS[key]).filter((panel) => panel.source.kind === "group" && panel.source.group === group);
}
