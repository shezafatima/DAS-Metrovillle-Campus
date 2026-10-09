"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "cn";
import { searchSite, type SearchResult } from "@/lib/site-search";

// Searches page titles across navigationItems (top-level items and their
// dropdown sub-pages) — the only real, non-placeholder content this site
// has to search yet (spec.md Out of Scope: real page content is a later
// feature). Not a full-text content search. Popout style (input + black
// square submit button) matches the reference's search popout. The icon
// stays put in the nav row at all times — the popout is a sibling overlay,
// not a replacement for it — and it positions via `top-full` against the
// nearest `position: relative` ancestor (the header row in header.tsx),
// so it opens below the whole row, not below the icon's own short height.
export function SearchBox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const results: SearchResult[] = open ? searchSite(query) : [];

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  const toggle = () => {
    if (open) {
      close();
      return;
    }
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const goToFirstResult = () => {
    if (results[0]) {
      router.push(results[0].href);
      close();
    }
  };

  return (
    <div className="flex items-center">
      <button
        type="button"
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
        onClick={toggle}
        className={cn(
          "flex items-center justify-center rounded-md p-2 text-text transition-colors duration-(--motion-fast) hover:bg-neutral-100 hover:text-primary",
          open && "bg-neutral-100 text-primary"
        )}
      >
        <Search aria-hidden="true" strokeWidth={2.75} className="size-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 rounded-md bg-surface p-3 shadow-card">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              goToFirstResult();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              placeholder="Search..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
              }}
              className="w-40 rounded-md border border-neutral-100 px-2 py-1.5 font-body text-nav-sub text-text outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-56"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="flex items-center justify-center rounded-md bg-text p-2 text-surface transition-colors duration-(--motion-fast) hover:bg-primary"
            >
              <Search aria-hidden="true" className="size-4" />
            </button>
          </form>

          {query.trim() && (
            <ul
              id={listboxId}
              role="listbox"
              className="mt-2 w-full min-w-56 border-t border-neutral-100 pt-2"
            >
              {results.length > 0 ? (
                results.map((result) => (
                  <li key={result.href} role="option" aria-selected={false}>
                    <Link
                      href={result.href}
                      onClick={close}
                      className="block px-2 py-1.5 font-body text-nav-sub text-text hover:bg-neutral-100 hover:text-primary"
                    >
                      {result.label}
                      {result.parentLabel && (
                        <span className="text-text-muted"> — {result.parentLabel}</span>
                      )}
                    </Link>
                  </li>
                ))
              ) : (
                <li
                  role="option"
                  aria-selected={false}
                  className="px-2 py-1.5 font-body text-nav-sub text-text-muted"
                >
                  No pages found
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
