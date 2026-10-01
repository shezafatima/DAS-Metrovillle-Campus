"use client";

import { useEffect } from "react";
import { newsCopy } from "@/content/admin";

/**
 * Warns before the admin loses in-progress input (003 news editor, 010
 * Account page — FR-017):
 *  - `beforeunload` covers closing the tab or reloading.
 *  - A capture-phase click listener covers in-app navigation (sidebar
 *    links, Cancel, the profile menu's Account link), since Next's App
 *    Router has no navigation-blocking API to hook into instead.
 *  - A capture-phase submit listener covers forms that leave the page
 *    and opt in with `data-leaves-page` (the profile menu's Logout form).
 *    Guarding the submit rather than the click means it holds however the
 *    menu item is activated (mouse, keyboard, pointerup).
 * All are no-ops whenever `isDirty` is false.
 */
export function useUnsavedChanges(isDirty: boolean, prompt: string = newsCopy.editor.unsavedPrompt): void {
  useEffect(() => {
    if (!isDirty) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function block(event: Event) {
      event.preventDefault();
      event.stopPropagation();
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const target = event.target as HTMLElement | null;
      const leaving = target?.closest("a[href], [data-leaves-page]") as HTMLElement | null;
      // Forms are guarded on submit (below), so a click inside one isn't prompted twice.
      if (!leaving || leaving.tagName === "FORM") return;
      if (leaving instanceof HTMLAnchorElement && leaving.target === "_blank") return;

      if (!window.confirm(prompt)) block(event);
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target as HTMLElement | null;
      if (!form?.hasAttribute("data-leaves-page")) return;
      if (!window.confirm(prompt)) block(event);
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, { capture: true });
    document.addEventListener("submit", handleSubmit, { capture: true });
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, { capture: true });
      document.removeEventListener("submit", handleSubmit, { capture: true });
    };
  }, [isDirty, prompt]);
}
