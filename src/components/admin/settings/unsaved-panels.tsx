"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useUnsavedChanges } from "@/components/admin/use-unsaved-changes";
import { settingsCopy } from "@/content/admin";

/**
 * One unsaved-changes guard per Settings tab (014, research R8). Each panel
 * reports whether it has unsaved edits; the provider installs the existing
 * leave guard once for the whole tab, so leaving (another tab, the sidebar,
 * "View on site", reload, close) asks once however many panels are unsaved.
 */

interface UnsavedPanels {
  report: (panel: string, dirty: boolean) => void;
  dirtyPanels: ReadonlySet<string>;
}

const UnsavedPanelsContext = createContext<UnsavedPanels | null>(null);

export function UnsavedPanelsProvider({ children }: { children: React.ReactNode }) {
  const [dirtyPanels, setDirtyPanels] = useState<ReadonlySet<string>>(() => new Set());

  const report = useCallback((panel: string, dirty: boolean) => {
    setDirtyPanels((current) => {
      if (current.has(panel) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(panel);
      else next.delete(panel);
      return next;
    });
  }, []);

  useUnsavedChanges(dirtyPanels.size > 0, settingsCopy.unsavedPrompt);

  const value = useMemo(() => ({ report, dirtyPanels }), [report, dirtyPanels]);
  return <UnsavedPanelsContext.Provider value={value}>{children}</UnsavedPanelsContext.Provider>;
}

/** Tells the tab's guard whether this panel has unsaved edits; clears itself on unmount. */
export function useReportUnsaved(panel: string, dirty: boolean): void {
  const context = useContext(UnsavedPanelsContext);
  const report = context?.report;
  useEffect(() => {
    report?.(panel, dirty);
  }, [report, panel, dirty]);
  useEffect(() => () => report?.(panel, false), [report, panel]);
}

/** Whether a panel currently has unsaved edits (for its header badge). */
export function usePanelUnsaved(panel: string): boolean {
  return useContext(UnsavedPanelsContext)?.dirtyPanels.has(panel) ?? false;
}
