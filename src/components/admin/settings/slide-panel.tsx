"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { settingsCopy } from "@/content/admin";
import { deepEqual, setAtPath, withoutErrorsUnder } from "@/lib/settings/form-state";
import { listItemSchema } from "@/lib/settings/schema";
import type { ListField } from "@/lib/settings/types";
import { fieldErrors } from "@/lib/validation/field-errors";
import { FieldControl } from "./field-control";
import { useSheetDirtyGuard } from "./use-sheet-dirty-guard";

type Item = Record<string, unknown>;

export interface SlidePanelProps {
  field: ListField;
  mode: "create" | "edit";
  /** The item being edited, or a blank one (`newItem`) when adding. */
  initial: Item;
  /** Called with the validated item when the admin chooses Done. It only changes the form; the group's Save persists it. */
  onDone: (item: Item) => void;
  triggerLabel: string;
  triggerAriaLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
  triggerSize?: "default" | "sm";
  /** Server-side errors for this item (paths relative to the item), shown when the panel opens. */
  serverErrors?: Record<string, string>;
}

/**
 * Add or edit one list item in a panel that slides in from the right (the
 * 011 user-panel pattern, 005 FR-014). Its fields are generated from the
 * list's `itemFields`; it closes on Escape, an outside click, the close
 * button or Cancel, asking first when anything changed, and is full width on
 * phones (the shared `Sheet`).
 */
export function SlidePanel({
  field,
  mode,
  initial,
  onDone,
  triggerLabel,
  triggerAriaLabel,
  triggerVariant = "outline",
  triggerSize = "default",
  serverErrors,
}: SlidePanelProps) {
  const guard = useSheetDirtyGuard(settingsCopy.list.panelUnsaved);
  const title = mode === "create" ? settingsCopy.list.addItem(field.itemLabel) : settingsCopy.list.editItem(field.itemLabel);

  return (
    <Sheet open={guard.open} onOpenChange={guard.requestOpenChange}>
      <SheetTrigger
        render={<Button type="button" variant={triggerVariant} size={triggerSize} aria-label={triggerAriaLabel} />}
      >
        {triggerLabel}
      </SheetTrigger>
      <SheetContent closeLabel={settingsCopy.list.close}>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{settingsCopy.list.panelIntro}</SheetDescription>
        </SheetHeader>
        <PanelBody
          field={field}
          initial={initial}
          serverErrors={serverErrors}
          onDirtyChange={guard.setDirty}
          onCancel={() => guard.requestOpenChange(false)}
          onDone={(item) => {
            onDone(item);
            guard.close();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}

function PanelBody({
  field,
  initial,
  serverErrors,
  onDirtyChange,
  onCancel,
  onDone,
}: {
  field: ListField;
  initial: Item;
  serverErrors?: Record<string, string>;
  onDirtyChange: (dirty: boolean) => void;
  onCancel: () => void;
  onDone: (item: Item) => void;
}) {
  // Mounted only while the panel is open, so every open starts from `initial`.
  // The starting item is captured once: a blank item is created with a fresh id
  // on every parent render, and comparing against that would always look changed.
  const [baseline] = useState<Item>(initial);
  const [draft, setDraft] = useState<Item>(baseline);
  const [errors, setErrors] = useState<Record<string, string>>(serverErrors ?? {});

  const dirty = !deepEqual(draft, baseline);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  function done() {
    const result = listItemSchema(field).safeParse(draft);
    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }
    // The form holds live items only, so the deleted marker the schema adds is dropped.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deletedAt, ...item } = result.data;
    onDone(item);
  }

  return (
    <div className="flex flex-1 flex-col gap-5" data-testid="slide-panel">
      {field.itemFields.map((child) => (
        <FieldControl
          key={child.key}
          field={child}
          path={child.key}
          value={draft[child.key]}
          onChange={(next) => setDraft((current) => setAtPath(current, [child.key], next) as Item)}
          errors={errors}
          clearError={(path) => setErrors((current) => withoutErrorsUnder(current, path))}
        />
      ))}

      <div className="mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          {settingsCopy.list.cancel}
        </Button>
        <Button type="button" onClick={done}>
          {settingsCopy.list.done}
        </Button>
      </div>
    </div>
  );
}
