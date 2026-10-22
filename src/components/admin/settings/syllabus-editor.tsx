"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Trash2 } from "lucide-react";
import { AdminConfirmDeleteDialog } from "@/components/admin/admin-delete-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { settingsCopy } from "@/content/admin";
import { moveItem } from "@/lib/settings/items";
import {
  countGroupTopics,
  countLevelTopics,
  countSubjectTopics,
  duplicateNames,
  isDuplicateName,
  newGroup,
  newLevel,
  newSubject,
  parseTopics,
  type SyllabusGroup,
  type SyllabusLevel,
  type SyllabusSubject,
} from "@/lib/syllabi/edit";
import { cn } from "cn";
import type { PanelEditorProps } from "./panel-editor";

const copy = settingsCopy.syllabus;
const LIMITS = { levels: 20, subjects: 10, groups: 20, topics: 100 } as const;

const textareaClass =
  "flex w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 font-light text-foreground text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 disabled:cursor-not-allowed disabled:opacity-50";

type Announce = (message: string) => void;

/** Up, down and remove for one item: the keyboard- and touch-friendly way to reorder (spec FR-011). */
function ItemControls({
  name,
  index,
  count,
  readOnly,
  onMove,
  remove,
}: {
  /** What the buttons are called: "level 2", "group 1 of subject 3". */
  name: string;
  index: number;
  count: number;
  readOnly: boolean;
  onMove: (index: number, delta: -1 | 1) => void;
  remove: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="outline" size="icon-sm" disabled={readOnly || index === 0} aria-label={settingsCopy.list.moveUp(name)} onClick={() => onMove(index, -1)}>
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button type="button" variant="outline" size="icon-sm" disabled={readOnly || index === count - 1} aria-label={settingsCopy.list.moveDown(name)} onClick={() => onMove(index, 1)}>
        <ArrowDown aria-hidden="true" />
      </Button>
      {remove}
    </div>
  );
}

/**
 * The topics of a group as one box, one topic per line (spec FR-013). The text
 * is kept here while typing, so a trailing line break survives; each change
 * reports the trimmed, non-blank lines.
 */
function TopicsField({
  id,
  topics,
  error,
  readOnly,
  onChange,
}: {
  id: string;
  topics: string[];
  error: string | undefined;
  readOnly: boolean;
  onChange: (topics: string[]) => void;
}) {
  const [text, setText] = useState(() => topics.join("\n"));
  const [seen, setSeen] = useState(topics);
  // A value that changed from outside (a reset after a save) replaces the text; the lines typed so far never do.
  // Adjusting state while rendering (not in an effect) is React's pattern for this: it re-renders once, at once.
  if (topics !== seen) {
    setSeen(topics);
    const parsed = parseTopics(text);
    if (parsed.length !== topics.length || parsed.some((line, i) => line !== topics[i])) setText(topics.join("\n"));
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold text-foreground text-sm">
        {settingsCopy.fields.syllabi.topics}
      </label>
      <textarea
        id={id}
        rows={6}
        value={text}
        disabled={readOnly}
        aria-invalid={error ? true : undefined}
        aria-describedby={`${id}-hint`}
        className={textareaClass}
        onChange={(event) => {
          setText(event.target.value);
          onChange(parseTopics(event.target.value));
        }}
      />
      <p id={`${id}-hint`} className="font-light text-muted-foreground text-xs">
        {settingsCopy.hints.topics} {copy.topicCount(topics.length)}
      </p>
      {error && (
        <p role="alert" className="font-light text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

const GroupEditor = memo(function GroupEditor({
  group,
  index,
  count,
  subjectLabel,
  path,
  errors,
  readOnly,
  onChange,
  onRemove,
  onMove,
}: {
  group: SyllabusGroup;
  index: number;
  count: number;
  /** "subject 2", for the buttons' names. */
  subjectLabel: string;
  path: string;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (id: string, next: SyllabusGroup) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: -1 | 1) => void;
}) {
  const uid = useId();
  const name = `group ${index + 1} of ${subjectLabel}`;
  const topics = countGroupTopics(group);
  const hasContent = topics > 0 || group.intro.trim() !== "" || group.heading.trim() !== "";

  const remove = hasContent ? (
    <AdminConfirmDeleteDialog itemName={name} copy={copy.removeGroup(topics)} disabled={readOnly} onConfirm={() => onRemove(group.id)} />
  ) : (
    <Button type="button" variant="ghost" size="icon-sm" disabled={readOnly} aria-label={`${copy.removeEmptyGroup}: ${name}`} onClick={() => onRemove(group.id)}>
      <Trash2 aria-hidden="true" />
    </Button>
  );

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="syllabus-group">
      <legend className="flex items-center gap-2 px-1 font-bold text-foreground text-sm">
        <span>{`Group ${index + 1}`}</span>
      </legend>
      <div className="flex justify-end">
        <ItemControls name={name} index={index} count={count} readOnly={readOnly} onMove={onMove} remove={remove} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-heading`} className="font-bold text-foreground text-sm">
          {settingsCopy.fields.syllabi.heading}
        </label>
        <Input id={`${uid}-heading`} value={group.heading} maxLength={120} disabled={readOnly} aria-invalid={errors[`${path}.heading`] ? true : undefined} onChange={(event) => onChange(group.id, { ...group, heading: event.target.value })} />
        {errors[`${path}.heading`] && (
          <p role="alert" className="font-light text-destructive text-sm">
            {errors[`${path}.heading`]}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-intro`} className="font-bold text-foreground text-sm">
          {settingsCopy.fields.syllabi.intro}
        </label>
        <textarea
          id={`${uid}-intro`}
          rows={3}
          value={group.intro}
          maxLength={1500}
          disabled={readOnly}
          aria-invalid={errors[`${path}.intro`] ? true : undefined}
          className={textareaClass}
          onChange={(event) => onChange(group.id, { ...group, intro: event.target.value })}
        />
        {errors[`${path}.intro`] && (
          <p role="alert" className="font-light text-destructive text-sm">
            {errors[`${path}.intro`]}
          </p>
        )}
      </div>
      <TopicsField id={`${uid}-topics`} topics={group.topics} error={errors[`${path}.topics`]} readOnly={readOnly} onChange={(next) => onChange(group.id, { ...group, topics: next })} />
    </fieldset>
  );
});

const SubjectEditor = memo(function SubjectEditor({
  subject,
  index,
  count,
  duplicate,
  path,
  errors,
  readOnly,
  onChange,
  onRemove,
  onMove,
  announce,
}: {
  subject: SyllabusSubject;
  index: number;
  count: number;
  duplicate: boolean;
  path: string;
  errors: Record<string, string>;
  readOnly: boolean;
  onChange: (id: string, next: SyllabusSubject) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  announce: Announce;
}) {
  const uid = useId();
  const label = `subject ${index + 1}`;
  const shown = subject.name.trim() || copy.subjectFallback(index + 1);
  const atMax = subject.groups.length >= LIMITS.groups;

  const updateGroup = useCallback((id: string, next: SyllabusGroup) => onChange(subject.id, { ...subject, groups: subject.groups.map((g) => (g.id === id ? next : g)) }), [onChange, subject]);
  const removeGroup = useCallback((id: string) => onChange(subject.id, { ...subject, groups: subject.groups.filter((g) => g.id !== id) }), [onChange, subject]);
  const moveGroup = useCallback(
    (from: number, delta: -1 | 1) => {
      const to = from + delta;
      onChange(subject.id, { ...subject, groups: moveItem(subject.groups, from, to) });
      announce(settingsCopy.list.moved(`group ${from + 1} of ${label}`, to + 1, subject.groups.length));
    },
    [announce, label, onChange, subject],
  );

  return (
    <section aria-labelledby={`${uid}-title`} className="flex flex-col gap-4 rounded-lg border border-border bg-background p-4" data-testid="syllabus-subject">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={`${uid}-title`} className="font-bold text-foreground text-sm">
          {`Subject ${index + 1}: ${shown}`}
        </h4>
        <ItemControls
          name={label}
          index={index}
          count={count}
          readOnly={readOnly}
          onMove={onMove}
          remove={<AdminConfirmDeleteDialog itemName={shown} copy={copy.removeSubject(shown, countSubjectTopics(subject))} disabled={readOnly} onConfirm={() => onRemove(subject.id)} />}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${uid}-name`} className="font-bold text-foreground text-sm">
          {settingsCopy.fields.syllabi.subjectName}
        </label>
        <Input id={`${uid}-name`} value={subject.name} maxLength={60} disabled={readOnly} aria-invalid={errors[`${path}.name`] ? true : undefined} onChange={(event) => onChange(subject.id, { ...subject, name: event.target.value })} />
        {errors[`${path}.name`] && (
          <p role="alert" className="font-light text-destructive text-sm">
            {errors[`${path}.name`]}
          </p>
        )}
        {duplicate && (
          <p data-testid="duplicate-warning" className="font-light text-foreground text-xs">
            {copy.duplicateName("subject", subject.name)}
          </p>
        )}
      </div>

      {subject.groups.length === 0 && <p className="font-light text-muted-foreground text-sm">{copy.noGroups}</p>}
      {subject.groups.map((group, groupIndex) => (
        <GroupEditor
          key={group.id}
          group={group}
          index={groupIndex}
          count={subject.groups.length}
          subjectLabel={label}
          path={`${path}.groups.${groupIndex}`}
          errors={errors}
          readOnly={readOnly}
          onChange={updateGroup}
          onRemove={removeGroup}
          onMove={moveGroup}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={readOnly || atMax} onClick={() => onChange(subject.id, { ...subject, groups: [...subject.groups, newGroup()] })}>
          {copy.addGroup}
        </Button>
        {atMax && <span className="font-light text-muted-foreground text-xs">{settingsCopy.errors.tooMany(LIMITS.groups)}</span>}
      </div>
    </section>
  );
});

const LevelEditor = memo(function LevelEditor({
  level,
  index,
  count,
  open,
  duplicate,
  errors,
  readOnly,
  onToggle,
  onChange,
  onRemove,
  onMove,
  announce,
}: {
  level: SyllabusLevel;
  index: number;
  count: number;
  open: boolean;
  duplicate: boolean;
  errors: Record<string, string>;
  readOnly: boolean;
  onToggle: (id: string) => void;
  onChange: (id: string, next: SyllabusLevel) => void;
  onRemove: (id: string) => void;
  onMove: (index: number, delta: -1 | 1) => void;
  announce: Announce;
}) {
  const uid = useId();
  const path = `levels.${index}`;
  const label = `level ${index + 1}`;
  const shown = level.name.trim() || copy.levelFallback(index + 1);
  const topics = countLevelTopics(level);
  const atMax = level.subjects.length >= LIMITS.subjects;

  const subjectNames = level.subjects.map((subject) => subject.name);
  const duplicates = open ? duplicateNames(subjectNames) : null;

  const updateSubject = useCallback((id: string, next: SyllabusSubject) => onChange(level.id, { ...level, subjects: level.subjects.map((s) => (s.id === id ? next : s)) }), [level, onChange]);
  const removeSubject = useCallback((id: string) => onChange(level.id, { ...level, subjects: level.subjects.filter((s) => s.id !== id) }), [level, onChange]);
  const moveSubject = useCallback(
    (from: number, delta: -1 | 1) => {
      const to = from + delta;
      onChange(level.id, { ...level, subjects: moveItem(level.subjects, from, to) });
      announce(settingsCopy.list.moved(`subject ${from + 1}`, to + 1, level.subjects.length));
    },
    [announce, level, onChange],
  );

  const levelError = errors[`${path}.name`] ?? errors[`${path}.subjects`];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-3" data-testid="syllabus-level" data-open={open}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="min-w-0 flex-1 font-bold text-foreground text-sm">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`${uid}-body`}
            onClick={() => onToggle(level.id)}
            className="flex w-full items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown aria-hidden="true" className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")} />
            <span className="min-w-0 break-words">{shown}</span>
            <span className="font-light text-muted-foreground text-xs">{copy.summary(level.subjects.length, topics)}</span>
          </button>
        </h3>
        <ItemControls
          name={label}
          index={index}
          count={count}
          readOnly={readOnly}
          onMove={onMove}
          remove={<AdminConfirmDeleteDialog itemName={shown} copy={copy.removeLevel(shown, topics)} disabled={readOnly} onConfirm={() => onRemove(level.id)} />}
        />
      </div>
      {levelError && !open && (
        <p role="alert" className="font-light text-destructive text-sm">
          {levelError}
        </p>
      )}

      {open && (
        <div id={`${uid}-body`} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={`${uid}-name`} className="font-bold text-foreground text-sm">
              {settingsCopy.fields.syllabi.levelName}
            </label>
            <Input id={`${uid}-name`} value={level.name} maxLength={60} disabled={readOnly} aria-invalid={errors[`${path}.name`] ? true : undefined} onChange={(event) => onChange(level.id, { ...level, name: event.target.value })} />
            {errors[`${path}.name`] && (
              <p role="alert" className="font-light text-destructive text-sm">
                {errors[`${path}.name`]}
              </p>
            )}
            {duplicate && (
              <p data-testid="duplicate-warning" className="font-light text-foreground text-xs">
                {copy.duplicateName("level", level.name)}
              </p>
            )}
          </div>

          {errors[`${path}.subjects`] && (
            <p role="alert" className="font-light text-destructive text-sm">
              {errors[`${path}.subjects`]}
            </p>
          )}
          {level.subjects.length === 0 && <p className="font-light text-muted-foreground text-sm">{copy.noSubjects}</p>}
          {level.subjects.map((subject, subjectIndex) => (
            <SubjectEditor
              key={subject.id}
              subject={subject}
              index={subjectIndex}
              count={level.subjects.length}
              duplicate={duplicates !== null && isDuplicateName(duplicates, subject.name)}
              path={`${path}.subjects.${subjectIndex}`}
              errors={errors}
              readOnly={readOnly}
              onChange={updateSubject}
              onRemove={removeSubject}
              onMove={moveSubject}
              announce={announce}
            />
          ))}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" disabled={readOnly || atMax} onClick={() => onChange(level.id, { ...level, subjects: [...level.subjects, newSubject()] })}>
              {copy.addSubject}
            </Button>
            {atMax && <span className="font-light text-muted-foreground text-xs">{settingsCopy.errors.tooMany(LIMITS.subjects)}</span>}
          </div>
        </div>
      )}
    </li>
  );
});

/**
 * The Syllabi editor (014b, spec FR-010–FR-016): levels, each with subjects, each
 * with groups (heading, intro, topics one per line). Only one level is open at a
 * time, so the panel stays usable with hundreds of topics; closed levels cost one
 * row each. Up/down buttons reorder levels, subjects and groups from the keyboard,
 * and removing asks first, saying how many topics go. Everything here only changes
 * the panel form's state; the panel's Save persists it.
 */
export function SyllabusEditor({ value, onChange, errors, clearError, readOnly }: PanelEditorProps) {
  const levels = (Array.isArray(value.levels) ? value.levels : []) as SyllabusLevel[];
  const [openId, setOpenId] = useState<string | null>(() => levels[0]?.id ?? null);
  const [announcement, setAnnouncement] = useState("");

  // The latest value and callbacks, read by the stable handlers below, so an edit
  // in one level does not re-render the others.
  const latest = useRef({ levels, onChange, clearError, value });
  useEffect(() => {
    latest.current = { levels, onChange, clearError, value };
  });

  const commit = useCallback((next: SyllabusLevel[]) => {
    const current = latest.current;
    current.onChange({ ...current.value, levels: next });
    current.clearError("levels");
  }, []);
  const toggle = useCallback((id: string) => setOpenId((current) => (current === id ? null : id)), []);
  const update = useCallback((id: string, next: SyllabusLevel) => commit(latest.current.levels.map((level) => (level.id === id ? next : level))), [commit]);
  const remove = useCallback(
    (id: string) => {
      commit(latest.current.levels.filter((level) => level.id !== id));
      setOpenId((current) => (current === id ? null : current));
    },
    [commit],
  );
  const announce = useCallback((message: string) => setAnnouncement(message), []);
  const move = useCallback(
    (from: number, delta: -1 | 1) => {
      const to = from + delta;
      const current = latest.current.levels;
      commit(moveItem(current, from, to));
      announce(settingsCopy.list.moved(`level ${from + 1}`, to + 1, current.length));
    },
    [announce, commit],
  );
  const add = useCallback(() => {
    const created = newLevel();
    commit([...latest.current.levels, created]);
    setOpenId(created.id);
  }, [commit]);

  const duplicates = duplicateNames(levels.map((level) => level.name));
  const atMax = levels.length >= LIMITS.levels;

  return (
    <div className="flex flex-col gap-4" data-testid="syllabus-editor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" disabled={readOnly || atMax} onClick={add}>
          {copy.addLevel}
        </Button>
        <Link href="/academics#syllabi" className="font-light text-primary text-sm underline-offset-4 hover:underline" data-testid="syllabus-preview">
          {copy.preview}
        </Link>
      </div>
      {atMax && <p className="font-light text-muted-foreground text-xs">{settingsCopy.errors.tooMany(LIMITS.levels)}</p>}
      {errors.levels && (
        <p role="alert" className="font-light text-destructive text-sm">
          {errors.levels}
        </p>
      )}
      <p className="sr-only" aria-live="polite" data-testid="syllabus-announcement">
        {announcement}
      </p>

      {levels.length === 0 ? (
        <p className="rounded-lg border border-border border-dashed p-6 text-center font-light text-muted-foreground text-sm">{copy.empty}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {levels.map((level, index) => (
            <LevelEditor
              key={level.id}
              level={level}
              index={index}
              count={levels.length}
              open={openId === level.id}
              duplicate={isDuplicateName(duplicates, level.name)}
              errors={errors}
              readOnly={readOnly}
              onToggle={toggle}
              onChange={update}
              onRemove={remove}
              onMove={move}
              announce={announce}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
