/**
 * The Settings field-definition format (005, contracts/field-definitions.md).
 * Pure types: no server imports, so the admin form (client) and the server
 * action share one description of each group (Constitution VI, VIII).
 */

// The photo gallery left this engine in 007: albums are written only by
// src/lib/gallery/store.ts (ADR-0005), so "gallery" is no longer a group key.
export const GROUP_KEYS = ["contact", "hero", "stats", "video", "admission", "portalLinks", "classLevels", "syllabi", "examination"] as const;
export type GroupKey = (typeof GROUP_KEYS)[number];

type FieldBase = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
};

export type TextField = FieldBase & {
  type: "text";
  maxLength: number;
  format?: "email";
  default?: string;
};

export type LongTextField = FieldBase & {
  type: "longText";
  maxLength: number;
  default?: string;
};

export type NumberField = FieldBase & {
  type: "number";
  min: number;
  max: number;
  /** Message shown for anything that is not a whole number in range. */
  errorMessage: string;
  default?: number;
};

export type UrlField = FieldBase & {
  type: "url";
  maxLength: number;
  /** Also accept a site path starting with a single "/". */
  allowPath?: boolean;
  /** Refuse an address that carries a username or password (`https://user:pass@host`) (014b). */
  rejectCredentials?: boolean;
  /**
   * 014b: the control shows "Visitors' browsers will mark this site as not secure." under an `http://`
   * address, and the scheme is stored in lower case. The address is still accepted.
   */
  warnInsecure?: boolean;
  /** 014b: the control shows a "Test link" that opens a valid address in a new tab and changes nothing. */
  testLink?: boolean;
  default?: string;
};

export type ImageFieldDef = FieldBase & {
  type: "image";
  /** Cloudinary folder every accepted publicId must start with. */
  folder: string;
  /** What the upload signer is asked for (`/api/admin/settings/uploads/sign`). "gallery" is used by the 007 album uploader. */
  kind: "hero-desktop" | "hero-mobile" | "gallery";
};

/** A YouTube video address (this phase's only "video" value; no file upload). */
export type VideoField = FieldBase & {
  type: "video";
  default?: string;
};

export type BooleanField = FieldBase & {
  type: "boolean";
  default?: boolean;
};

/**
 * A calendar date with no time or zone (020): stored as "YYYY-MM-DD", or ""
 * when empty. Whatever the date means in time (e.g. Pakistan midnight) is
 * decided by the code that reads it, never by the stored value.
 */
export type DateField = FieldBase & {
  type: "date";
  default?: string;
  /**
   * 027: the picker starts at today (Pakistan time), and a panel check refuses a CHANGED value earlier than today
   * (see `changedPastDates`). An unchanged stored date, even a past one, is left alone.
   */
  notBeforeToday?: boolean;
};

/**
 * A day and month with no year (014b), stored as "MM-DD" (the Class Levels
 * age reference date). The control is two selects, Day and Month. The day must
 * exist in that month in a leap year ("02-29" yes, "04-31" no).
 */
export type DayMonthField = FieldBase & {
  type: "dayMonth";
  default?: string;
};

/**
 * A list of plain text lines (014b), stored as `string[]` (a syllabus group's
 * topics). The control is one textarea, one line each. A string is split on line
 * breaks; every line is trimmed and blank lines are dropped before the limits
 * apply (`maxItems` lines, `maxLength` characters each).
 */
export type LinesField = FieldBase & {
  type: "lines";
  maxItems: number;
  maxLength: number;
  default?: string[];
};

/** A nested object of fields, e.g. contact.social. */
export type GroupField = FieldBase & {
  type: "group";
  fields: Field[];
};

export type ListRule =
  | { kind: "atLeastOneVisible"; field: string; message: string }
  | { kind: "allOrNone"; fields: string[]; message: string }
  // 013: no two items may share a value in `field` (compared ignoring case and extra spaces). A function message
  // (014b) is given the repeated text as typed, so the error can name it.
  | { kind: "uniqueText"; field: string; message: string | ((value: string) => string) }
  // 014b: at least one of `fields` must have content (a non-blank text, or a non-empty list); the message is shown on the first.
  | { kind: "anyOf"; fields: string[]; message: string };

export type ListField = FieldBase & {
  type: "list";
  itemFields: Field[];
  maxItems: number;
  /** Singular name used in messages and accessible names: "slide", "image". */
  itemLabel: string;
  rules?: ListRule[];
  /** Rows at ≥ md and cards below (default), or cards at every width. */
  layout?: "table" | "cards";
  /** Item keys for the row thumbnail and the row title (first non-empty wins). */
  summary?: { image?: string; title: string[] };
  /** Deleted items kept for this list instead of the default 500 (014b: a syllabus keeps its 10 most recent removed levels). */
  maxDeletedRetained?: number;
  /** Add through the right-hand panel (the only mode since 007 moved the gallery out). */
  addMode?: "panel";
  /** Item fields edited directly on the card, with no panel. */
  inlineFields?: string[];
  default?: Record<string, unknown>[];
};

export type Field =
  | TextField
  | LongTextField
  | NumberField
  | UrlField
  | ImageFieldDef
  | VideoField
  | BooleanField
  | DateField
  | DayMonthField
  | LinesField
  | GroupField
  | ListField;

export type FieldType = Field["type"];

/**
 * A rule across two top-level fields of a group (020). `dateOrder`: when both
 * date fields are set, `to` must be on or after `from`; the message is shown
 * on `to`.
 */
export type GroupRule =
  | { kind: "dateOrder"; from: string; to: string; message: string }
  // 014b: all the `lines` fields found by following `path` ("levels.subjects.groups.topics": list keys, then the lines key)
  // together hold at most `max` lines. The message is shown on the first key of the path (the top-level list).
  | { kind: "maxTotalLines"; path: string; max: number; message: string };

export interface GroupDefinition {
  key: GroupKey;
  label: string;
  fields: Field[];
  rules?: GroupRule[];
}

/** A Cloudinary image reference (data-model.md "ImageRef"). Never a binary. */
export interface ImageRef {
  url: string;
  publicId: string;
  width: number;
  height: number;
}

/** What the engine adds to every list item. The editor sends live items only. */
export interface ItemEnvelope {
  id: string;
  deletedAt: Date | null;
}

export type ListItem = ItemEnvelope & Record<string, unknown>;

/** A group's value: keys from the definition; lists hold items with the envelope. */
export type GroupValue = Record<string, unknown>;

/** The bundled placeholder slide images (clarification 1): the only images allowed without a publicId. */
export const PLACEHOLDER_IMAGE_URLS = [
  "/images/hero/placeholder-desktop.svg",
  "/images/hero/placeholder-mobile.svg",
] as const;

/**
 * What the panel save actions return (014, contracts/panel-actions.md):
 * `saveSettingsPanel` and `savePagesPanel`. `data` holds the panel's fields only.
 */
export type ConfirmPanelResult =
  | { status: "success"; changed: boolean }
  | { status: "error"; error: "unauthorized" | "forbidden" | "unavailable" }
  | { status: "error"; error: "invalid"; fields: Record<string, string> };

export type SavePanelResult =
  | { status: "success"; version: number; fingerprint: string; data: GroupValue; savedAt: string; updatedBy: string }
  | { status: "error"; error: "unauthorized" | "forbidden" | "conflict" | "unavailable" }
  | { status: "error"; error: "invalid" | "image_rejected"; fields: Record<string, string> };
