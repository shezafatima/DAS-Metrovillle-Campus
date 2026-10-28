"use client";

import { useState } from "react";
import { FormControl, FormDescription, FormField, FormLabel, FormMessage } from "@/components/ui/form";
import { settingsCopy } from "@/content/admin";
import { karachiToday } from "@/lib/admission/window";
import { urlFieldAccepts } from "@/lib/settings/schema";
import type { Field, ImageRef } from "@/lib/settings/types";
import { MONTH_NAMES, joinDayMonth, splitDayMonth } from "@/lib/text/day-month";
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
 * "Test link" (014b, spec FR-043): opens a valid address in a new tab and
 * changes nothing in the form. Until the address is valid it is a disabled
 * link with no destination, so it can never open something unsafe.
 */
function TestLink({ field, value }: { field: Extract<Field, { type: "url" }>; value: string }) {
  const address = value.trim();
  const valid = urlFieldAccepts(field, address);
  const className = "w-fit font-light text-primary text-xs underline-offset-4";
  if (!valid) {
    return (
      <span aria-disabled="true" title={settingsCopy.testLinkNeedsAddress} className={`${className} cursor-not-allowed opacity-60`}>
        {settingsCopy.testLink}
      </span>
    );
  }
  return (
    <a href={address} target="_blank" rel="noopener noreferrer" className={`${className} hover:underline`}>
      {settingsCopy.testLink}
      <span className="sr-only"> ({settingsCopy.hints.testLink})</span>
    </a>
  );
}

const selectClass = "h-9 rounded-md border border-input bg-background px-2 font-light text-foreground text-sm";
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));

/**
 * A day and a month with no year (014b: the Class Levels age reference date):
 * two labelled native selects inside one fieldset. The value is "MM-DD". A
 * half-chosen date lives in the value too ("04-" or "-15") and an impossible one
 * ("04-31") is kept as chosen, so the save shows "Choose a real day and month."
 * on this field, and the selects always show exactly what the value holds.
 */
function DayMonthControl({
  field,
  path,
  value,
  onChange,
  error,
  clearError,
}: {
  field: Extract<Field, { type: "dayMonth" }>;
  path: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  clearError: (path: string) => void;
}) {
  const draft = splitDayMonth(value);

  function update(next: { month: string; day: string }) {
    onChange(joinDayMonth(next.month, next.day));
    if (error) clearError(path);
  }

  const describedBy = [field.hint ? `${path}-hint` : null, error ? `${path}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={describedBy} aria-invalid={Boolean(error) || undefined}>
      <legend className="font-bold text-foreground text-sm">{field.label}</legend>
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 font-light text-foreground text-sm">
          {settingsCopy.fields.classLevels.day}
          <select name={`${path}-day`} value={draft.day} onChange={(event) => update({ ...draft, day: event.target.value })} className={selectClass}>
            <option value="">—</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {Number(day)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 font-light text-foreground text-sm">
          {settingsCopy.fields.classLevels.month}
          <select name={`${path}-month`} value={draft.month} onChange={(event) => update({ ...draft, month: event.target.value })} className={selectClass}>
            <option value="">—</option>
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={String(index + 1).padStart(2, "0")}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {field.hint && (
        <p id={`${path}-hint`} className="font-light text-muted-foreground text-xs">
          {field.hint}
        </p>
      )}
      {error && (
        <p id={`${path}-error`} role="alert" className="font-light text-destructive text-sm">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/**
 * A native date input (020). Marked `notBeforeToday` (027), its picker starts at today, Pakistan time.
 *
 * The minimum is decided ONCE, from the value the field starts with, and then stays put:
 *  - changing `min` while someone types a year makes Chrome drop the half-typed date;
 *  - a field that starts on a past date (a window that opened last week) gets no minimum, because a value below `min`
 *    is invalid to the form library, which then cancels the whole submit without calling our handler;
 *  - a date typed below the minimum is shown its own message (`rangeUnderflow`) instead of failing silently.
 * The server refuses a changed past date as well (`changedPastDates`), for requests that do not come from this control.
 */
function DateControl({
  field,
  path,
  value,
  onChange,
  error,
  clearError,
}: {
  field: Extract<Field, { type: "date" }>;
  path: string;
  value: string;
  onChange: (value: string) => void;
  error: string | undefined;
  clearError: (path: string) => void;
}) {
  const [min] = useState(() => {
    if (!field.notBeforeToday) return undefined;
    const today = karachiToday(new Date());
    return value === "" || value >= today ? today : undefined;
  });
  return (
    <FormField name={path} invalid={Boolean(error)}>
      <FormLabel>{field.label}</FormLabel>
      <FormControl
        type="date"
        className="w-fit"
        min={min}
        value={value}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          onChange(event.target.value);
          if (error) clearError(path);
        }}
      />
      {field.hint && <FormDescription>{field.hint}</FormDescription>}
      {min && <FormMessage match="rangeUnderflow">{settingsCopy.errors.dateInPast}</FormMessage>}
      {error && <FormMessage match>{error}</FormMessage>}
    </FormField>
  );
}

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
          {field.type === "url" && field.warnInsecure && /^http:\/\//i.test(text.trim()) && (
            <p data-testid="insecure-warning" className="font-semibold text-foreground text-xs">
              {settingsCopy.hints.insecureUrl}
            </p>
          )}
          {field.type === "url" && field.testLink && <TestLink field={field} value={text} />}
          {max !== undefined && max <= COUNTER_LIMIT && (
            <p className="font-light text-muted-foreground text-xs" aria-hidden="true">
              {settingsCopy.list.charCount(text.length, max)}
            </p>
          )}
          {error && <FormMessage match>{error}</FormMessage>}
        </FormField>
      );
    }

    case "date":
      return <DateControl field={field} path={path} value={typeof value === "string" ? value : ""} onChange={onChange} error={error} clearError={clearError} />;

    case "dayMonth":
      return (
        <DayMonthControl
          field={field}
          path={path}
          value={typeof value === "string" ? value : ""}
          onChange={onChange}
          error={error}
          clearError={clearError}
        />
      );

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
