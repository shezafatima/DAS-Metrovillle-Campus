"use client";

import { useState } from "react";
import { saveSettingsGroup } from "@/app/admin/(dashboard)/settings/actions";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { settingsCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import type { AdminSettings } from "@/lib/settings/admin";
import { deepEqual, withoutErrorsUnder } from "@/lib/settings/form-state";
import { parseGroup } from "@/lib/settings/schema";
import type { GroupDefinition, GroupValue } from "@/lib/settings/types";
import { FieldControl } from "./field-control";

interface SavedState {
  data: GroupValue;
  version: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

/**
 * The one admin form for every settings group (005 FR-006): it renders the
 * group's definition, validates with the same schema the server uses, and
 * saves the whole group through `saveSettingsGroup`. Nothing is hand-built
 * per group.
 *
 * - Edits, including list changes and uploads, stay in the form until Save.
 * - A failed save (validation, conflict, server error) keeps every edit.
 * - Leaving with unsaved changes warns first (`useUnsavedChanges`).
 */
export function SettingsGroupForm({ definition, initial }: { definition: GroupDefinition; initial: AdminSettings }) {
  const [saved, setSaved] = useState<SavedState>({
    data: initial.data,
    version: initial.version,
    updatedAt: initial.updatedAt,
    updatedBy: initial.updatedBy,
  });
  const [value, setValue] = useState<GroupValue>(initial.data);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = !deepEqual(value, saved.data);
  useUnsavedChanges(dirty, settingsCopy.unsavedPrompt);

  const clearError = (path: string) => setErrors((current) => withoutErrorsUnder(current, path));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const parsed = parseGroup(definition, value);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      toast({ title: settingsCopy.toasts.invalid, type: "error" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const result = await saveSettingsGroup({
        group: definition.key,
        expectedVersion: saved.version,
        data: parsed.data,
      });

      if (result.status === "success") {
        setValue(result.data);
        setSaved({ data: result.data, version: result.version, updatedAt: result.savedAt, updatedBy: result.updatedBy });
        toast({ title: settingsCopy.toasts.saved(definition.label), type: "success" });
        return;
      }

      // Every failure keeps what the admin typed.
      if (result.error === "invalid" || result.error === "image_rejected") {
        setErrors(result.fields);
        toast({ title: settingsCopy.toasts.invalid, type: "error" });
      } else if (result.error === "conflict") {
        toast({ title: settingsCopy.toasts.conflict, type: "error" });
      } else if (result.error === "forbidden") {
        toast({ title: settingsCopy.toasts.forbidden, type: "error" });
      } else if (result.error === "unauthorized") {
        toast({ title: settingsCopy.toasts.unauthorized, type: "error" });
      } else {
        toast({ title: settingsCopy.toasts.unavailable, type: "error" });
      }
    } catch {
      toast({ title: settingsCopy.toasts.unavailable, type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const lastSaved =
    saved.version === 0
      ? settingsCopy.notSavedYet
      : saved.updatedAt
        ? settingsCopy.lastSaved(saved.updatedBy ?? "you", formatAdminDateTime(new Date(saved.updatedAt)))
        : null;

  return (
    <Form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {definition.fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          path={field.key}
          value={value[field.key]}
          onChange={(next) => setValue((current) => ({ ...current, [field.key]: next }))}
          errors={errors}
          clearError={clearError}
        />
      ))}

      <div className="flex flex-wrap items-center gap-4 border-border border-t pt-4">
        <Button type="submit" disabled={saving || !dirty}>
          {saving ? settingsCopy.saving : settingsCopy.save}
        </Button>
        {lastSaved && (
          <p className="font-light text-muted-foreground text-xs" data-testid="last-saved">
            {lastSaved}
          </p>
        )}
      </div>
    </Form>
  );
}
