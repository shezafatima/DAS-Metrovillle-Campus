import { z } from "zod";
import { settingsCopy } from "@/content/admin";
import { isDayMonth } from "@/lib/text/day-month";
import { collapseSpaces, fieldErrors } from "@/lib/validation/field-errors";
import { parseYouTubeAddress } from "./youtube";
import {
  PLACEHOLDER_IMAGE_URLS,
  type DateField,
  type DayMonthField,
  type Field,
  type GroupDefinition,
  type GroupValue,
  type ImageFieldDef,
  type ImageRef,
  type LinesField,
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

function isAllowedUrl(value: string, allowPath: boolean | undefined, rejectCredentials?: boolean): boolean {
  if (/\s/.test(value)) return false;
  if (allowPath && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")) return true;
  if (!/^https?:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    if (rejectCredentials && (url.username !== "" || url.password !== "")) return false;
    return (url.protocol === "https:" || url.protocol === "http:") && url.hostname.length > 0;
  } catch {
    return false;
  }
}

/** True for `https://user:pass@host` style addresses (used to give them their own message). */
function hasCredentials(value: string): boolean {
  if (!/^https?:\/\//i.test(value) || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.username !== "" || url.password !== "";
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
  // 014b: a field that warns about http:// also stores its scheme in lower case ("HTTPS://x" is "https://x").
  const normalise = (value: unknown) => {
    const text = emptyIfNil(value);
    return field.warnInsecure && typeof text === "string" ? text.trim().replace(/^(https?):\/\//i, (_match, scheme: string) => `${scheme.toLowerCase()}://`) : text;
  };
  return z.preprocess(
    normalise,
    base.superRefine((value, ctx) => {
      if (value === "" && !field.required) return;
      if (isAllowedUrl(value, field.allowPath, field.rejectCredentials)) return;
      ctx.addIssue({ code: "custom", message: field.rejectCredentials && hasCredentials(value) ? msg.urlCredentials : message });
    }),
  );
}

/** True when `value` would pass a URL field's schema (the "Test link" control enables itself with this). */
export function urlFieldAccepts(field: Extract<Field, { type: "url" }>, value: string): boolean {
  return value.trim() !== "" && urlSchema(field).safeParse(value).success;
}

function videoSchema(field: Extract<Field, { type: "video" }>): z.ZodType {
  let base = z.string({ error: msg.youtube }).trim().max(300, msg.maxLength(300));
  if (field.required) base = base.min(1, msg.required);
  return z.preprocess(
    emptyIfNil,
    base.refine((value) => (value === "" && !field.required) || parseYouTubeAddress(value) !== null, msg.youtube),
  );
}

/** True for a real calendar date written "YYYY-MM-DD" (so "2027-02-30" is refused). */
export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function dateSchema(field: DateField): z.ZodType {
  let base = z.string({ error: msg.date }).trim();
  if (field.required) base = base.min(1, msg.required);
  return z.preprocess(
    emptyIfNil,
    base.refine((value) => value === "" || isCalendarDate(value), msg.date),
  );
}

function dayMonthSchema(field: DayMonthField): z.ZodType {
  let base = z.string({ error: msg.dayMonth }).trim();
  if (field.required) base = base.min(1, msg.required);
  return z.preprocess(
    emptyIfNil,
    base.refine((value) => (value === "" && !field.required) || isDayMonth(value), msg.dayMonth),
  );
}

/**
 * A `lines` field (014b): a string is split on line breaks, an array is taken as it is; each line is
 * trimmed and blank lines are dropped. Then the count and every line's length are checked, the first
 * line over the limit being named by its number.
 */
function linesSchema(field: LinesField): z.ZodType {
  const toLines = (value: unknown) => (value === null || value === undefined ? [] : typeof value === "string" ? value.split(/\r?\n/) : value);
  return z.preprocess(
    toLines,
    z
      .array(z.string({ error: msg.required }))
      .transform((lines) => lines.map((line) => line.trim()).filter((line) => line !== ""))
      .superRefine((lines, ctx) => {
        if (lines.length > field.maxItems) {
          ctx.addIssue({ code: "custom", message: msg.tooManyLines(field.maxItems) });
          return;
        }
        const tooLong = lines.findIndex((line) => line.length > field.maxLength);
        if (tooLong >= 0) ctx.addIssue({ code: "custom", message: msg.lineTooLong(tooLong + 1, field.maxLength) });
      }),
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
  const anyOf = (field.rules ?? []).filter((rule) => rule.kind === "anyOf");
  const hasContent = (entry: unknown) => (Array.isArray(entry) ? entry.length > 0 : String(entry ?? "").trim() !== "");
  return z.object(itemShape).superRefine((value, ctx) => {
    for (const rule of allOrNone) {
      if (rule.kind !== "allOrNone") continue;
      const filled = rule.fields.filter((key) => String(value[key] ?? "").trim() !== "").length;
      if (filled > 0 && filled < rule.fields.length) {
        ctx.addIssue({ code: "custom", path: [rule.fields[0]], message: rule.message });
      }
    }
    for (const rule of anyOf) {
      if (rule.kind !== "anyOf") continue;
      if (!rule.fields.some((key) => hasContent(value[key]))) ctx.addIssue({ code: "custom", path: [rule.fields[0]], message: rule.message });
    }
  }) as unknown as z.ZodType<Record<string, unknown>>;
}

function listSchema(field: ListField): z.ZodType {
  const item = listItemSchema(field);

  const visibleRules = (field.rules ?? []).filter((rule) => rule.kind === "atLeastOneVisible");
  const uniqueRules = (field.rules ?? []).filter((rule) => rule.kind === "uniqueText");
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
      for (const rule of uniqueRules) {
        if (rule.kind !== "uniqueText") continue;
        const seenText = new Set<string>();
        items.forEach((value, index) => {
          const typed = collapseSpaces(String((value as Record<string, unknown>)[rule.field] ?? ""));
          const text = typed.toLowerCase();
          if (text === "") return;
          if (seenText.has(text)) {
            ctx.addIssue({ code: "custom", path: [index, rule.field], message: typeof rule.message === "function" ? rule.message(typed) : rule.message });
          }
          seenText.add(text);
        });
      }
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
    case "date":
      return dateSchema(field);
    case "dayMonth":
      return dayMonthSchema(field);
    case "lines":
      return linesSchema(field);
    case "group":
      return z.preprocess(
        (value) => (value === null || value === undefined ? {} : value),
        z.object(Object.fromEntries(field.fields.map((child) => [child.key, fieldSchema(child)]))),
      );
    case "list":
      return listSchema(field);
  }
}

/** How many lines the `lines` fields found by following `segments` through nested lists hold in all (014b, `maxTotalLines`). */
function countLines(value: unknown, segments: readonly string[]): number {
  if (!value || typeof value !== "object") return 0;
  const next = (value as Record<string, unknown>)[segments[0]];
  if (!Array.isArray(next)) return 0;
  if (segments.length === 1) return next.length;
  return next.reduce((sum: number, entry) => sum + countLines(entry, segments.slice(1)), 0);
}

const cache = new WeakMap<GroupDefinition, z.ZodType<GroupValue>>();

/**
 * The Zod schema for a group's value. Unknown keys are dropped. Group rules
 * (020) run after every field is valid, so they only compare clean values.
 */
export function schemaFor(def: GroupDefinition): z.ZodType<GroupValue> {
  let schema = cache.get(def);
  if (!schema) {
    const object = z.object(Object.fromEntries(def.fields.map((field) => [field.key, fieldSchema(field)])));
    const rules = def.rules ?? [];
    schema = (
      rules.length === 0
        ? object
        : object.superRefine((value: Record<string, unknown>, ctx) => {
            for (const rule of rules) {
              if (rule.kind === "dateOrder") {
                const from = String(value[rule.from] ?? "");
                const to = String(value[rule.to] ?? "");
                // Zero-padded ISO dates compare correctly as strings.
                if (from !== "" && to !== "" && to < from) ctx.addIssue({ code: "custom", path: [rule.to], message: rule.message });
              } else if (rule.kind === "maxTotalLines") {
                const segments = rule.path.split(".");
                if (countLines(value, segments) > rule.max) ctx.addIssue({ code: "custom", path: [segments[0]], message: rule.message });
              }
            }
          })
    ) as unknown as z.ZodType<GroupValue>;
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
