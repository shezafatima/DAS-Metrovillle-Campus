import type { Field, GroupDefinition, GroupValue } from "./types";

/**
 * Starting values for a group, built from its field definitions (005
 * FR-006, FR-009). A group that has never been saved reads as these values,
 * so no seed step or migration is needed, and adding a field later just
 * means giving it a `default` in its definition.
 */

export function defaultForField(field: Field): unknown {
  switch (field.type) {
    case "text":
    case "longText":
    case "url":
    case "video":
      return field.default ?? "";
    case "number":
      return field.default ?? field.min;
    case "boolean":
      return field.default ?? false;
    case "image":
      return null;
    case "group":
      return Object.fromEntries(field.fields.map((child) => [child.key, defaultForField(child)]));
    case "list":
      return structuredClone(field.default ?? []);
  }
}

export function defaultsFor(def: GroupDefinition): GroupValue {
  return Object.fromEntries(def.fields.map((field) => [field.key, defaultForField(field)]));
}

function mergeFields(fields: Field[], data: Record<string, unknown>): GroupValue {
  const out: GroupValue = {};
  for (const field of fields) {
    const value = data[field.key];
    if (field.type === "group") {
      const nested = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
      out[field.key] = mergeFields(field.fields, nested);
    } else if (field.type === "list") {
      out[field.key] = Array.isArray(value) ? value : defaultForField(field);
    } else {
      out[field.key] = value !== undefined ? value : defaultForField(field);
    }
  }
  return out;
}

/**
 * A stored value with any missing keys filled from the definition's
 * defaults, and any key the definition does not know dropped. Lets a field
 * added after a group was first saved appear without a data migration.
 */
export function mergeWithDefaults(def: GroupDefinition, data: unknown): GroupValue {
  const source = data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
  return mergeFields(def.fields, source);
}
