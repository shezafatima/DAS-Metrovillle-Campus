import { z } from "zod";
import { settingsCopy } from "@/content/admin";
import { fieldErrors } from "@/lib/validation/field-errors";
import { parseYouTubeAddress } from "./youtube";
import {
  PLACEHOLDER_IMAGE_URLS,
  type Field,
  type GroupDefinition,
  type GroupValue,
  type ImageFieldDef,
  type ImageRef,
  type ListField,
} from "./types";

/**
 * One Zod schema per group, derived from its definition (005 FR-006). The
 * admin form validates with it in the browser and the Server Action with the
 * same object on the server, so the two cannot drift (Constitution VI).
 *
 * This validates what an admin SENDS: list items are live only (an incoming
 * item may not claim to be deleted). Soft-delete bookkeeping happens after
 * validation, in items.ts.
 */

const msg = settingsCopy.errors;

const EMAIL = z.email();

function isAllowedUrl(value: string, allowPath: boolean | undefined): boolean {
  if (/\s/.test(value)) return false;
  if (allowPath && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

const emptyIfNil = (value: unknown) => (value === null || value === undefined ? "" : value);

function textSchema(field: Extract<Field, { type: "text" | "longText" }>): z.ZodType {
  let base = z
    .string({ error: msg.required })
    .trim()
    .max(field.maxLength, msg.maxLength(field.maxLength));
  if (field.required) base = base.min(1, msg.required);
  let schema: z.ZodType = base;
  if (field.type === "text" && field.format === "email") {
    schema = base.refine((value) => value === "" || EMAIL.safeParse(value).success, msg.email);
  }
  return z.preprocess(emptyIfNil, schema);
}

function numberSchema(field: Extract<Field, { type: "number" }>): z.ZodType {
  const message = field.errorMessage;
  return z.preprocess(
    (value) => (typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value.trim()) : value),
    z.number({ error: message }).int(message).min(field.min, message).max(field.max, message),
  );
}

function urlSchema(field: Extract<Field, { type: "url" }>): z.ZodType {
  const message = field.allowPath ? msg.urlOrPath : msg.url;
  let base = z
    .string({ error: message })
    .trim()
    .max(field.maxLength, msg.maxLength(field.maxLength));
  if (field.required) base = base.min(1, msg.required);
  return z.preprocess(
    emptyIfNil,
    base.refine((value) => (value === "" && !field.required) || isAllowedUrl(value, field.allowPath), message),
  );
}

function videoSchema(field: Extract<Field, { type: "video" }>): z.ZodType {
  let base = z.string({ error: msg.youtube }).trim().max(300, msg.maxLength(300));
  if (field.required) base = base.min(1, msg.required);
  return z.preprocess(
    emptyIfNil,
    base.refine((value) => (value === "" && !field.required) || parseYouTubeAddress(value) !== null, msg.youtube),
  );
}

function imageSchema(field: ImageFieldDef): z.ZodType {
  const ref = z
    .object(
      {
        url: z.string().min(1).max(1000),
        publicId: z.string().max(300),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      },
      { error: msg.imageRequired },
    )
    .refine((value: ImageRef) => {
      if (value.publicId === "") return (PLACEHOLDER_IMAGE_URLS as readonly string[]).includes(value.url);
      return value.publicId.startsWith(`${field.folder}/`) && /^https:\/\//i.test(value.url);
    }, msg.imageRequired);
  return z.preprocess((value) => (value === undefined ? null : value), field.required ? ref : ref.nullable());
}

/** The schema for ONE list item (used by the list schema and by the slide panel's "Done" check). */
export function listItemSchema(field: ListField): z.ZodType<Record<string, unknown>> {
  const itemShape: Record<string, z.ZodType> = {
    id: z.string({ error: msg.unknownItem }).uuid(msg.unknownItem),
    // The editor sends live items only; an item claiming to be deleted is refused.
    deletedAt: z
      .null({ error: msg.unknownItem })
      .optional()
      .transform(() => null),
  };
  for (const child of field.itemFields) itemShape[child.key] = fieldSchema(child);

  const allOrNone = (field.rules ?? []).filter((rule) => rule.kind === "allOrNone");
  return z.object(itemShape).superRefine((value, ctx) => {
    for (const rule of allOrNone) {
      if (rule.kind !== "allOrNone") continue;
      const filled = rule.fields.filter((key) => String(value[key] ?? "").trim() !== "").length;
      if (filled > 0 && filled < rule.fields.length) {
        ctx.addIssue({ code: "custom", path: [rule.fields[0]], message: rule.message });
      }
    }
  }) as unknown as z.ZodType<Record<string, unknown>>;
}

function listSchema(field: ListField): z.ZodType {
  const item = listItemSchema(field);

  const visibleRules = (field.rules ?? []).filter((rule) => rule.kind === "atLeastOneVisible");
  const array = z
    .array(item)
    .max(field.maxItems, msg.tooMany(field.maxItems))
    .superRefine((items, ctx) => {
      const seen = new Set<string>();
      items.forEach((value, index) => {
        const id = String((value as Record<string, unknown>).id);
        if (seen.has(id)) ctx.addIssue({ code: "custom", path: [index, "id"], message: msg.unknownItem });
        seen.add(id);
      });
      for (const rule of visibleRules) {
        if (rule.kind !== "atLeastOneVisible") continue;
        if (!items.some((value) => (value as Record<string, unknown>)[rule.field] === true)) {
          ctx.addIssue({ code: "custom", path: [], message: rule.message });
        }
      }
    });
  return z.preprocess((value) => (value === null || value === undefined ? [] : value), array);
}

function fieldSchema(field: Field): z.ZodType {
  switch (field.type) {
    case "text":
    case "longText":
      return textSchema(field);
    case "number":
      return numberSchema(field);
    case "url":
      return urlSchema(field);
    case "video":
      return videoSchema(field);
    case "image":
      return imageSchema(field);
    case "boolean":
      return z.preprocess((value) => (value === undefined ? (field.default ?? false) : value), z.boolean());
    case "group":
      return z.preprocess(
        (value) => (value === null || value === undefined ? {} : value),
        z.object(Object.fromEntries(field.fields.map((child) => [child.key, fieldSchema(child)]))),
      );
    case "list":
      return listSchema(field);
  }
}

const cache = new WeakMap<GroupDefinition, z.ZodType<GroupValue>>();

/** The Zod schema for a group's value. Unknown keys are dropped. */
export function schemaFor(def: GroupDefinition): z.ZodType<GroupValue> {
  let schema = cache.get(def);
  if (!schema) {
    schema = z.object(Object.fromEntries(def.fields.map((field) => [field.key, fieldSchema(field)]))) as unknown as z.ZodType<GroupValue>;
    cache.set(def, schema);
  }
  return schema;
}

export type ParseGroupResult = { ok: true; data: GroupValue } | { ok: false; fields: Record<string, string> };

/** Validates a group value; failures come back as `{ "path.to.field": "message" }`. */
export function parseGroup(def: GroupDefinition, input: unknown): ParseGroupResult {
  const result = schemaFor(def).safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fields: fieldErrors(result.error) };
}

/** Every image reference in a group value (top-level fields and list items), with the folder it must live in. */
export function collectImages(def: GroupDefinition, data: unknown): { path: string; publicId: string; folder: string }[] {
  const found: { path: string; publicId: string; folder: string }[] = [];
  const visit = (fields: Field[], value: unknown, prefix: string) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    for (const field of fields) {
      const path = prefix ? `${prefix}.${field.key}` : field.key;
      const child = record[field.key];
      if (field.type === "image") {
        const publicId = (child as { publicId?: unknown } | null | undefined)?.publicId;
        if (typeof publicId === "string" && publicId !== "") found.push({ path, publicId, folder: field.folder });
      } else if (field.type === "group") {
        visit(field.fields, child, path);
      } else if (field.type === "list" && Array.isArray(child)) {
        child.forEach((entry, index) => visit(field.itemFields, entry, `${path}.${index}`));
      }
    }
  };
  visit(def.fields, data, "");
  return found;
}
