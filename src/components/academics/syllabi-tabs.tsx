"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "cn";
import type { SyllabiCopy } from "@/content/academics/dynamic-sections";

export interface SyllabiTabLevel {
  id: string;
  name: string;
  slug: string;
}

const PREFIX = "syllabi-";

/**
 * The level tabs of the Syllabi section (014b, spec FR-017, research R12), the
 * WAI-ARIA tabs pattern: from tablet width a row of tabs (arrow keys, Home and
 * End move between them and select the one focused, only the selected tab is in
 * the tab order); below it a labelled picker. Every level's panel is already in
 * the page (rendered on the server and passed in), so only `hidden` changes.
 *
 * The address follows the choice: `#syllabi-<slug>` is replaced into the URL
 * without a history entry, and arriving on `#syllabi` or `#syllabi-<slug>`
 * selects the first or that level (an unknown slug selects the first) and
 * scrolls the section into view.
 */
export function SyllabiTabs({ levels, panels, copy }: { levels: SyllabiTabLevel[]; panels: ReactNode[]; copy: SyllabiCopy }) {
  const [selected, setSelected] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const slugs = levels.map((level) => level.slug).join("\n");

  const choose = useCallback(
    (index: number, { focus = false }: { focus?: boolean } = {}) => {
      const next = levels[index];
      if (!next) return;
      setSelected(index);
      // Replaces the fragment without adding a history entry or scrolling.
      window.history.replaceState(null, "", `#${PREFIX}${next.slug}`);
      if (focus) tabRefs.current[index]?.focus();
    },
    [levels],
  );

  useEffect(() => {
    function fromAddress() {
      const hash = window.location.hash;
      if (hash !== "#syllabi" && !hash.startsWith(`#${PREFIX}`)) return;
      const slug = hash === "#syllabi" ? "" : decodeURIComponent(hash.slice(PREFIX.length + 1));
      const index = slugs.split("\n").indexOf(slug);
      setSelected(index >= 0 ? index : 0);
      // The fragment names no element of its own, so the browser does not scroll to it.
      requestAnimationFrame(() => document.getElementById("syllabi")?.scrollIntoView({ block: "start" }));
    }
    fromAddress();
    window.addEventListener("hashchange", fromAddress);
    return () => window.removeEventListener("hashchange", fromAddress);
  }, [slugs]);

  function onKeyDown(event: React.KeyboardEvent) {
    const last = levels.length - 1;
    let to: number | null = null;
    if (event.key === "ArrowRight") to = selected === last ? 0 : selected + 1;
    else if (event.key === "ArrowLeft") to = selected === 0 ? last : selected - 1;
    else if (event.key === "Home") to = 0;
    else if (event.key === "End") to = last;
    if (to === null) return;
    event.preventDefault();
    choose(to, { focus: true });
  }

  const current = Math.min(selected, levels.length - 1);

  return (
    <div className="flex flex-col gap-6" data-testid="syllabi-tabs">
      <div role="tablist" aria-label={copy.tabsLabel} onKeyDown={onKeyDown} className="hidden gap-1 overflow-x-auto rounded-md bg-(--color-home-muted-band) p-1 md:flex" data-testid="syllabi-tablist">
        {levels.map((level, index) => {
          const active = index === current;
          return (
            <button
              key={level.id}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`${PREFIX}${level.slug}-tab`}
              aria-selected={active}
              aria-controls={`${PREFIX}${level.slug}-panel`}
              tabIndex={active ? 0 : -1}
              onClick={() => choose(index)}
              className={cn(
                "shrink-0 rounded-sm px-4 py-2 font-body font-semibold text-sm uppercase tracking-wide outline-none transition-colors duration-(--motion-fast) focus-visible:ring-2 focus-visible:ring-primary",
                active ? "bg-primary text-white" : "text-primary hover:bg-surface",
              )}
            >
              {level.name}
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 md:hidden" data-testid="syllabi-picker">
        <label htmlFor="syllabi-picker-select" className="font-body font-semibold text-sm text-text">
          {copy.pickerLabel}
        </label>
        <select
          id="syllabi-picker-select"
          value={current}
          onChange={(event) => choose(Number(event.target.value))}
          className="h-11 w-full rounded-md border border-neutral-100 bg-surface px-3 font-body text-body text-text"
        >
          {levels.map((level, index) => (
            <option key={level.id} value={index}>
              {level.name}
            </option>
          ))}
        </select>
      </div>

      {levels.map((level, index) => (
        <div
          key={level.id}
          role="tabpanel"
          id={`${PREFIX}${level.slug}-panel`}
          aria-labelledby={`${PREFIX}${level.slug}-tab`}
          tabIndex={0}
          hidden={index !== current}
          className="flex flex-col gap-6 outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {panels[index]}
        </div>
      ))}
    </div>
  );
}
