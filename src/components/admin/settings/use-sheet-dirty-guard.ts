"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Open/close state for a right-hand panel that asks before discarding
 * changes (011 FR-038, reused by the Settings slide panel). Escape, an
 * outside click, the close button and Cancel all go through
 * `requestOpenChange(false)`, which confirms first only when the panel has
 * unsaved input. `close()` closes without asking (after "Done").
 */
export function useSheetDirtyGuard(discardPrompt: string) {
  const [open, setOpen] = useState(false);
  const dirtyRef = useRef(false);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const requestOpenChange = useCallback(
    (next: boolean) => {
      if (!next && dirtyRef.current && !window.confirm(discardPrompt)) return;
      if (!next) dirtyRef.current = false;
      setOpen(next);
    },
    [discardPrompt],
  );

  const close = useCallback(() => {
    dirtyRef.current = false;
    setOpen(false);
  }, []);

  return { open, requestOpenChange, setDirty, close };
}
