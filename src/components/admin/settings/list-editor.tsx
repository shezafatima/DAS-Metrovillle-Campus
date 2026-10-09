"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { settingsCopy } from "@/content/admin";
import { itemErrors, newItem } from "@/lib/settings/form-state";
import { moveItem } from "@/lib/settings/items";
import type { ImageRef, ListField } from "@/lib/settings/types";
import { cn } from "cn";
import { FieldControl } from "./field-control";
import { ImagePreview } from "./image-field";
import { SlidePanel } from "./slide-panel";

type Item = Record<string, unknown>;

export interface ListEditorProps {
  field: ListField;
  path: string;
  items: Item[];
  onChange: (items: Item[]) => void;
  errors: Record<string, string>;
  clearError: (path: string) => void;
}

function rowTitle(field: ListField, item: Item, index: number): string {
  for (const key of field.summary?.title ?? []) {
    const value = item[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return `${field.itemLabel} ${index + 1}`;
}

/**
 * The generic editor for a list field (hero slides; 005 FR-014,
 * FR-022). Rows show a thumbnail and title, with up/down buttons (the
 * keyboard- and touch-friendly way to reorder), a drag handle for mouse
 * users, hide/show, edit (in the right-hand panel) and delete (after a
 * confirmation). Everything here only changes the group's form state; the
 * group's Save persists it.
 *
 * With an `atLeastOneVisible` rule, hide and delete are unavailable on the
 * last visible item (the server refuses such a save regardless).
 */
export function ListEditor({ field, path, items, onChange, errors, clearError }: ListEditorProps) {
  const [announcement, setAnnouncement] = useState("");
  const [armed, setArmed] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  const visibleRule = field.rules?.find((rule) => rule.kind === "atLeastOneVisible");
  const visibleKey = visibleRule?.kind === "atLeastOneVisible" ? visibleRule.field : null;
  const visibleCount = visibleKey ? items.filter((item) => item[visibleKey] === true).length : Number.POSITIVE_INFINITY;

  const cards = field.layout === "cards";
  const nameOf = (index: number) => `${field.itemLabel} ${index + 1}`;
  const inlineFields = field.itemFields.filter((child) => field.inlineFields?.includes(child.key));
  const atMax = items.length >= field.maxItems;
  const listError = errors[path];

  function move(from: number, to: number) {
    const next = moveItem(items, from, to);
    if (next.every((item, i) => item === items[i])) return;
    onChange(next);
    clearError(path);
    setAnnouncement(settingsCopy.list.moved(nameOf(from), to + 1, items.length));
  }

  function replaceAt(index: number, item: Item) {
    onChange(items.map((current, i) => (i === index ? item : current)));
    clearError(`${path}.${index}`);
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
    clearError(path);
  }

  return (
    <div className="flex flex-col gap-3" data-testid={`list-${path}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-foreground text-sm">{field.label}</h2>
        <div className="flex items-center gap-2">
          {atMax && <span className="font-light text-muted-foreground text-xs">{settingsCopy.errors.tooMany(field.maxItems)}</span>}
          {atMax ? (
            <Button type="button" variant="default" disabled>
              {settingsCopy.list.addItem(field.itemLabel)}
            </Button>
          ) : (
            <SlidePanel
              field={field}
              mode="create"
              initial={newItem(field)}
              triggerLabel={settingsCopy.list.addItem(field.itemLabel)}
              triggerVariant="default"
              onDone={(item) => {
                onChange([...items, item]);
                clearError(path);
              }}
            />
          )}
        </div>
      </div>

      {listError && (
        <p role="alert" className="font-light text-destructive text-sm">
          {listError}
        </p>
      )}

      <p className="sr-only" aria-live="polite" data-testid="list-announcement">
        {announcement}
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-border border-dashed p-6 text-center font-light text-muted-foreground text-sm">
          {settingsCopy.list.empty}
        </p>
      ) : (
        <ul className={cn("grid gap-3", cards && "sm:grid-cols-2 xl:grid-cols-3")}>
          {items.map((item, index) => {
            const id = String(item.id);
            const isHidden = visibleKey !== null && item[visibleKey] !== true;
            const isLastVisible = visibleKey !== null && item[visibleKey] === true && visibleCount === 1;
            const rowErrors = itemErrors(errors, path, index);
            const rowError = Object.values(rowErrors)[0];
            const thumb = field.summary?.image ? (item[field.summary.image] as ImageRef | null | undefined) : null;
            const name = nameOf(index);

            return (
              <li
                key={id}
                data-testid="list-item"
                draggable={armed === index}
                onDragStart={(event) => {
                  dragFrom.current = index;
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", String(index));
                }}
                onDragOver={(event) => {
                  if (dragFrom.current === null) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = dragFrom.current;
                  dragFrom.current = null;
                  setArmed(null);
                  if (from !== null && from !== index) move(from, index);
                }}
                onDragEnd={() => {
                  dragFrom.current = null;
                  setArmed(null);
                }}
                className={cn(
                  "flex flex-col gap-3 rounded-lg border border-border bg-background p-3",
                  !cards && "md:flex-row md:items-center",
                  isHidden && "opacity-70",
                  rowError && "border-destructive",
                )}
              >
                <div className={cn("flex items-center gap-3", !cards && "md:flex-1")}>
                  <span
                    aria-hidden="true"
                    title={settingsCopy.list.dragHandle}
                    onPointerDown={() => setArmed(index)}
                    onPointerUp={() => setArmed(null)}
                    className="hidden shrink-0 cursor-grab text-muted-foreground md:inline-flex"
                  >
                    <GripVertical className="size-4" />
                  </span>
                  {thumb && (
                    <ImagePreview
                      image={thumb}
                      alt=""
                      className={cn("shrink-0 rounded border border-input object-cover", cards ? "h-24 w-full" : "h-16 w-28")}
                    />
                  )}
                  {!cards && (
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="break-words font-bold text-foreground text-sm">{rowTitle(field, item, index)}</span>
                      {isHidden && <Badge variant="outline">{settingsCopy.list.hidden}</Badge>}
                    </div>
                  )}
                </div>

                {cards && (
                  <div className="flex flex-col gap-2">
                    {inlineFields.map((child) => (
                      <FieldControl
                        key={child.key}
                        field={child}
                        path={`${path}.${index}.${child.key}`}
                        value={item[child.key]}
                        onChange={(next) => replaceAt(index, { ...item, [child.key]: next })}
                        errors={errors}
                        clearError={clearError}
                      />
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === 0}
                    aria-label={settingsCopy.list.moveUp(name)}
                    onClick={() => move(index, index - 1)}
                  >
                    <ArrowUp aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={index === items.length - 1}
                    aria-label={settingsCopy.list.moveDown(name)}
                    onClick={() => move(index, index + 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                  </Button>

                  <SlidePanel
                    field={field}
                    mode="edit"
                    initial={item}
                    triggerLabel={settingsCopy.list.edit}
                    triggerAriaLabel={settingsCopy.list.editItem(name)}
                    triggerSize="sm"
                    serverErrors={rowErrors}
                    onDone={(next) => replaceAt(index, next)}
                  />

                  {visibleKey !== null && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isLastVisible}
                      aria-label={`${item[visibleKey] === true ? settingsCopy.list.hide : settingsCopy.list.show} ${name}`}
                      onClick={() => replaceAt(index, { ...item, [visibleKey]: item[visibleKey] !== true })}
                    >
                      {item[visibleKey] === true ? settingsCopy.list.hide : settingsCopy.list.show}
                    </Button>
                  )}

                  <AdminConfirmDeleteDialog
                    itemName={name}
                    copy={field.itemLabel === "slide" ? settingsCopy.deleteSlide : settingsCopy.deleteImage}
                    disabled={isLastVisible}
                    onConfirm={() => removeAt(index)}
                  />
                </div>

                {isLastVisible && (
                  <p className="font-light text-muted-foreground text-xs">{settingsCopy.list.lastVisibleReason}</p>
                )}
                {rowError && (
                  <p role="alert" className="font-light text-destructive text-xs">
                    {rowError}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
