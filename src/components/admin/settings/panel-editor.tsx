"use client";

import type { PanelEditorKind } from "@/lib/settings/panels";
import type { GroupValue } from "@/lib/settings/types";
import { ClassesChecklist } from "./classes-checklist";
import { SyllabusEditor } from "./syllabus-editor";

/**
 * What a custom panel editor receives (014b). It is the same state the generic
 * field list works on: the panel's value, a way to change it, the server-shaped
 * field errors keyed by dotted path, and the read-only flag. `extra` carries
 * server data an editor needs beyond the panel itself (the checklist's live
 * Class Levels).
 */
export interface PanelEditorProps {
  kind: PanelEditorKind;
  value: GroupValue;
  onChange: (next: GroupValue) => void;
  errors: Record<string, string>;
  /** Remove any error at or under a path when the admin edits it. */
  clearError: (path: string) => void;
  readOnly: boolean;
  extra?: unknown;
}

/**
 * Maps a panel's `editor` kind to its component. SettingsPanelForm renders it
 * inside the panel's own form, so saving, validation, the unsaved marker and
 * read-only mode are shared. Each story adds its case: the syllabus editor
 * (US4) and the classes checklist (US2).
 */
export function PanelEditor(props: PanelEditorProps): React.ReactElement {
  switch (props.kind) {
    case "classes-checklist":
      return <ClassesChecklist {...props} />;
    case "syllabus":
      return <SyllabusEditor {...props} />;
    default:
      throw new Error(`No panel editor is registered for "${props.kind}"`);
  }
}
