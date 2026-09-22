"use client";

import { useEffect } from "react";
import { newsCopy } from "@/content/admin";

/**
 * Warns before the admin loses in-progress edits (FR-009, spec edge
 * case "leaving the editor with unsaved changes warns first"):
 *  - `beforeunload` covers closing the tab or reloading.
 *  - A capture-phase click listener covers in-app navigation (sidebar
 *    links, Cancel), since Next's App Router has no navigation-
 *    blocking API to hook into instead.
 * Both are no-ops whenever `isDirty` is false.
 */
export function useUnsavedChanges(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank") return;

      const confirmed = window.confirm(newsCopy.editor.unsavedPrompt);
      if (!confirmed) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [isDirty]);
}
