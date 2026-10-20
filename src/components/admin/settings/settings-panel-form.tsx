"use client";

import { useState } from "react";
import { savePagesPanel, saveSettingsPanel } from "@/app/admin/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "@/components/ui/toaster";
import { settingsCopy } from "@/content/admin";
import { formatAdminDateTime } from "@/lib/admin-datetime";
import { PERMISSION_LABELS } from "@/lib/permissions";
import type { AdminPanel } from "@/lib/settings/admin";
import { deepEqual, withoutErrorsUnder } from "@/lib/settings/form-state";
import { PANELS, panelDefinition, type PanelKey } from "@/lib/settings/panels";
import { parseGroup } from "@/lib/settings/schema";
import type { GroupValue } from "@/lib/settings/types";
import { FieldControl } from "./field-control";
import { PanelEditor } from "./panel-editor";
import { useReportUnsaved } from "./unsaved-panels";

/**
 * The one admin form for every Settings panel (005 engine, 014 panels). It
 * renders the panel's fields from its group definition, validates with the
 * same schema the server uses, and saves through the action for the panel's
 * permission (`saveSettingsPanel` or `savePagesPanel`).
 *
 * - Edits, including list changes and uploads, stay in the form until Save.
 * - A failed save (validation, conflict, server error) keeps every edit.
 * - The page refreshes after any save. A mounted form ignores new `initial`
 *   props (tab pages key it on the panel, never on a version), so a sibling
 *   panel's save never resets this one (research R4, "Client side").
 * - Unsaved edits are reported to the tab's single leave guard.
 * - Read-only: shown to someone who may open the tab but not save this panel.
 * - A panel with an `editor` (014b: Syllabi, the classes checklist) renders that
 *   component in place of the generic fields; everything else here is shared.
 *   `extra` is server data such an editor needs (the checklist's Class Levels).
 */
export function SettingsPanelForm({
  panel,
  initial,
  readOnly = false,
  extra,
}: {
  panel: PanelKey;
  initial: AdminPanel;
  readOnly?: boolean;
  extra?: unknown;
}) {
  const definition = panelDefinition(PANELS[panel]);
  const saveAccess = PANELS[panel].saveAccess;
  const editor = PANELS[panel].editor;
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState<GroupValue>(initial.data);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dirty = !readOnly && !deepEqual(value, saved.data);
  useReportUnsaved(panel, dirty);

  const clearError = (path: string) => setErrors((current) => withoutErrorsUnder(current, path));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || readOnly) return;

    const parsed = parseGroup(definition, value);
    if (!parsed.ok) {
      setErrors(parsed.fields);
      toast({ title: settingsCopy.toasts.invalid, type: "error" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const save = saveAccess === "settings" ? saveSettingsPanel : savePagesPanel;
      const result = await save({ panel, expectedFingerprint: saved.fingerprint, data: parsed.data });

      if (result.status === "success") {
        setValue(result.data);
        setSaved((current) => ({ ...current, data: result.data, fingerprint: result.fingerprint, lastSaved: { by: result.updatedBy, at: result.savedAt } }));
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

  const lastSaved = saved.lastSaved
    ? settingsCopy.lastSaved(saved.lastSaved.by, formatAdminDateTime(new Date(saved.lastSaved.at)))
    : settingsCopy.notSavedYet;

  return (
    <Form className="flex max-w-3xl flex-col gap-6" onSubmit={handleSubmit} noValidate>
      {/* A disabled fieldset disables every control inside, list and image buttons included. */}
      <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-6">
        {editor ? (
          <PanelEditor kind={editor} value={value} onChange={setValue} errors={errors} clearError={clearError} readOnly={readOnly} extra={extra} />
        ) : (
          definition.fields.map((field) => (
            <FieldControl
              key={field.key}
              field={field}
              path={field.key}
              value={value[field.key]}
              onChange={(next) => setValue((current) => ({ ...current, [field.key]: next }))}
              errors={errors}
              clearError={clearError}
            />
          ))
        )}
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-border border-t pt-4">
        {readOnly ? (
          <p className="font-semibold text-foreground text-sm" data-testid="panel-read-only">
            {settingsCopy.readOnly.needs(PERMISSION_LABELS[saveAccess])}
          </p>
        ) : (
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? settingsCopy.saving : settingsCopy.save}
          </Button>
        )}
        <p className="font-light text-muted-foreground text-xs" data-testid="last-saved">
          {lastSaved}
        </p>
      </div>
    </Form>
  );
}
