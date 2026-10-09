"use client";

import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { settingsCopy } from "@/content/admin";
import type { Field, ImageRef } from "@/lib/settings/types";
import { ImageField } from "./image-field";
import { ListEditor } from "./list-editor";

export interface FieldControlProps {
  field: Field;
  /** Dotted path from the group root, matching the server's field errors: `social.tiktok`, `slides.1.alt`. */
  path: string;
  value: unknown;
  onChange: (value: unknown) => void;
  errors: Record<string, string>;
  /** Remove any error at or under a path when the admin edits it. */
  clearError: (path: string) => void;
}

const COUNTER_LIMIT = 200;

/**
 * Maps one field definition to its control (contracts/field-definitions.md
 * "Form rendering"). Every text-like control sits inside the shared
 * `ui/form.tsx` primitives; there is no per-group form component.
 */
export function FieldControl({ field, path, value, onChange, errors, clearError }: FieldControlProps) {
  const error = errors[path];

  switch (field.type) {
    case "text":
    case "longText":
    case "url":
    case "video":
    case "number": {
      const text = value === null || value === undefined ? "" : String(value);
      const max = field.type === "number" || field.type === "video" ? undefined : field.maxLength;
      const isLong = field.type === "longText";
      return (
        <FormField name={path} invalid={Boolean(error)}>
          <FormLabel>{field.label}</FormLabel>
          <FormControl
            {...(isLong ? { render: <textarea rows={3} /> } : {})}
            className={isLong ? "h-auto min-h-20 py-2" : undefined}
            value={text}
            maxLength={max}
            inputMode={field.type === "number" ? "numeric" : field.type === "url" ? "url" : undefined}
            autoComplete="off"
            onChange={(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
              onChange(event.target.value);
              if (error) clearError(path);
            }}
          />
          {field.hint && <FormDescription>{field.hint}</FormDescription>}
          {max !== undefined && max <= COUNTER_LIMIT && (
            <p className="font-light text-muted-foreground text-xs" aria-hidden="true">
              {settingsCopy.list.charCount(text.length, max)}
            </p>
          )}
          {error && <FormMessage match>{error}</FormMessage>}
        </FormField>
      );
    }

    case "boolean":
      return (
        <label className="flex items-center gap-2 font-light text-foreground text-sm">
          <input
            type="checkbox"
            name={path}
            checked={Boolean(value)}
            onChange={(event) => onChange(event.target.checked)}
            className="size-4 accent-primary"
          />
          {field.label}
        </label>
      );

    case "image":
      return (
        <ImageField
          field={field}
          path={path}
          value={(value as ImageRef | null | undefined) ?? null}
          onChange={(next) => {
            onChange(next);
            if (error) clearError(path);
          }}
          error={error}
        />
      );

    case "group": {
      const nested = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
      return (
        <fieldset className="flex flex-col gap-4 rounded-lg border border-border p-4">
          <legend className="px-1 font-bold text-foreground text-sm">{field.label}</legend>
          {field.fields.map((child) => (
            <FieldControl
              key={child.key}
              field={child}
              path={`${path}.${child.key}`}
              value={nested[child.key]}
              onChange={(next) => onChange({ ...nested, [child.key]: next })}
              errors={errors}
              clearError={clearError}
            />
          ))}
        </fieldset>
      );
    }

    case "list":
      return (
        <ListEditor
          field={field}
          path={path}
          items={Array.isArray(value) ? (value as Record<string, unknown>[]) : []}
          onChange={onChange}
          errors={errors}
          clearError={clearError}
        />
      );
  }
}
