/**
 * The Settings field-definition format (005, contracts/field-definitions.md).
 * Pure types: no server imports, so the admin form (client) and the server
 * action share one description of each group (Constitution VI, VIII).
 */

// The photo gallery left this engine in 007: albums are written only by
// src/lib/gallery/store.ts (ADR-0005), so "gallery" is no longer a group key.
export const GROUP_KEYS = ["contact", "hero", "stats", "video"] as const;
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

/** A nested object of fields, e.g. contact.social. */
export type GroupField = FieldBase & {
  type: "group";
  fields: Field[];
};

export type ListRule =
  | { kind: "atLeastOneVisible"; field: string; message: string }
  | { kind: "allOrNone"; fields: string[]; message: string };

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
  | GroupField
  | ListField;

export type FieldType = Field["type"];

export interface GroupDefinition {
  key: GroupKey;
  label: string;
  fields: Field[];
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

/** What the `saveSettingsGroup` Server Action returns (contracts/settings-actions.md). */
export type SaveSettingsResult =
  | { status: "success"; version: number; data: GroupValue; savedAt: string; updatedBy: string }
  | { status: "error"; error: "unauthorized" | "forbidden" | "conflict" | "unavailable" }
  | { status: "error"; error: "invalid" | "image_rejected"; fields: Record<string, string> };
