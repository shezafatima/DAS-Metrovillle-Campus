"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { settingsCopy } from "@/content/admin";
import type { GroupValue } from "@/lib/settings/types";

type Item = { id: string; name: string; levelId: string } & Record<string, unknown>;

/** A live Class Level the checklist can tick: the server passes them in Class Levels order. */
export interface ChecklistLevel {
  id: string;
  name: string;
}

export interface ClassesChecklistProps {
  value: GroupValue;
  onChange: (next: GroupValue) => void;
  errors: Record<string, string>;
  clearError: (path: string) => void;
  readOnly: boolean;
  /** `{ levels }`: the live Class Levels, in table order. */
  extra?: unknown;
}

const toItems = (value: unknown): Item[] =>
  Array.isArray(value)
    ? value
        .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object")
        .map((entry) => ({ ...entry, id: String(entry.id), name: String(entry.name ?? ""), levelId: String(entry.levelId ?? "") }))
    : [];

function levelsOf(extra: unknown): ChecklistLevel[] {
  const levels = (extra as { levels?: unknown } | undefined)?.levels;
  return Array.isArray(levels) ? (levels as ChecklistLevel[]) : [];
}

const copy = settingsCopy.checklist;

/**
 * "Classes open for admission" as a checklist of the Class Levels rows (014b,
 * spec FR-032, ADR-0014). Ticking a level stores a reference to it (its id,
 * with a snapshot of its name); the registration form then offers the ticked
 * levels in table order under their current names.
 *
 * Three kinds of stored item show up here:
 *  - ticked: its level exists, so its checkbox is checked;
 *  - not linked: a name typed before Class Levels existed. It is still offered
 *    in the form, and is listed here to link to a level or remove;
 *  - removed: its level was deleted since. It is not offered, and a warning names
 *    it until an admin clears it (saving acknowledges it).
 *
 * It only changes the form's state; the panel's Save persists it (the server
 * refuses a tick for a level that no longer exists).
 */
export function ClassesChecklist({ value, onChange, errors, clearError, readOnly, extra }: ClassesChecklistProps) {
  const items = toItems(value.classes);
  const levels = levelsOf(extra);
  const liveIds = new Set(levels.map((level) => level.id));

  const ticked = items.filter((item) => item.levelId !== "" && liveIds.has(item.levelId));
  const tickedIds = new Set(ticked.map((item) => item.levelId));
  const notLinked = items.filter((item) => item.levelId === "");
  const removed = items.filter((item) => item.levelId !== "" && !liveIds.has(item.levelId));
  const linkable = levels.filter((level) => !tickedIds.has(level.id));
  const listError = errors.classes;

  function set(next: Item[]) {
    onChange({ ...value, classes: next });
    clearError("classes");
  }

  function toggle(level: ChecklistLevel, on: boolean) {
    if (on) {
      if (!tickedIds.has(level.id)) set([...items, { id: crypto.randomUUID(), name: level.name, levelId: level.id }]);
      return;
    }
    set(items.filter((item) => item.levelId !== level.id));
  }

  function link(item: Item, levelId: string) {
    const level = levels.find((entry) => entry.id === levelId);
    if (!level) return;
    set(items.map((entry) => (entry.id === item.id ? { ...entry, levelId: level.id, name: level.name } : entry)));
  }

  return (
    <div className="flex flex-col gap-5" data-testid="classes-checklist">
      <p className="font-light text-muted-foreground text-sm">{copy.intro}</p>

      {listError && (
        <p role="alert" className="font-light text-destructive text-sm">
          {listError}
        </p>
      )}

      {removed.length > 0 && (
        <div role="status" data-testid="removed-levels-warning" className="flex flex-col gap-3 rounded-md border border-destructive bg-destructive/10 p-3">
          <p className="font-semibold text-foreground text-sm">{copy.removedWarning(removed.map((item) => item.name))}</p>
          <Button type="button" variant="outline" size="sm" className="w-fit" disabled={readOnly} onClick={() => set(items.filter((item) => !removed.includes(item)))}>
            {copy.clearWarning}
          </Button>
        </div>
      )}

      {levels.length === 0 ? (
        <p data-testid="no-levels" className="rounded-lg border border-border border-dashed p-4 font-light text-muted-foreground text-sm">
          {copy.noLevels}{" "}
          <Link href="#class-levels" className="font-semibold text-primary underline-offset-4 hover:underline">
            {copy.goToLevels}
          </Link>
        </p>
      ) : (
        // A group, not a fieldset: the panel form already wraps its controls in the one fieldset that read-only mode disables.
        <div role="group" aria-label={settingsCopy.panels["admission-classes"]} className="flex flex-col gap-2">
          {levels.map((level) => (
            <label key={level.id} className="flex items-center gap-2 font-light text-foreground text-sm">
              <input
                type="checkbox"
                name={`open-${level.id}`}
                checked={tickedIds.has(level.id)}
                disabled={readOnly}
                onChange={(event) => toggle(level, event.target.checked)}
                className="size-4 accent-primary"
              />
              {level.name}
            </label>
          ))}
        </div>
      )}

      {notLinked.length > 0 && (
        <section aria-labelledby="not-linked-title" data-testid="not-linked" className="flex flex-col gap-3 rounded-lg border border-border p-3">
          <h3 id="not-linked-title" className="font-bold text-foreground text-sm">
            {copy.notLinkedTitle}
          </h3>
          <p className="font-light text-muted-foreground text-xs">{copy.notLinkedIntro}</p>
          <ul className="flex flex-col gap-2">
            {notLinked.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words font-semibold text-foreground text-sm">{item.name}</span>
                <select
                  aria-label={copy.linkTo(item.name)}
                  value=""
                  disabled={readOnly || linkable.length === 0}
                  onChange={(event) => link(item, event.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 font-light text-sm"
                >
                  <option value="">{copy.linkPlaceholder}</option>
                  {linkable.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={readOnly}
                  aria-label={copy.remove(item.name)}
                  onClick={() => set(items.filter((entry) => entry.id !== item.id))}
                >
                  {copy.removeButton}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
