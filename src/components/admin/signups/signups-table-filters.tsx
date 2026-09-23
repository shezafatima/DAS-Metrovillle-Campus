"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { signupsCopy } from "@/content/admin";
import { SIGNUP_SOURCES } from "@/lib/signup/sources";

const DEBOUNCE_MS = 300;

/**
 * Search + page filters for the admin signups table (FR-018).
 * Filters live in the URL's search params, same as
 * NewsTableFilters, with two fixes over that component (found while
 * verifying the AdminPagination lift, T034 — logged there, not fixed
 * there since news-table-filters.tsx is out of this feature's scope;
 * this component must not repeat either bug):
 *
 * 1. The debounced callback reads `searchParams`/`pathname`/`router`
 *    from a ref updated every render, not from the effect's own
 *    closure — NewsTableFilters's `[query]`-only dependency array
 *    closes over the searchParams from whenever the component last
 *    mounted, so a stale timer can fire setParam with pre-navigation
 *    values.
 * 2. The debounced callback only calls setParam when `query` actually
 *    differs from the URL's current `q` — otherwise every mount fires
 *    a same-value "q" update 300ms later purely as a side effect of
 *    the effect running once, and setParam's `params.delete("page")`
 *    (any filter change resets to page 1) silently resets pagination
 *    if the admin clicks Next within that window, even though nothing
 *    about the search actually changed.
 */
export function SignupsTableFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Always holds the latest render's values, read by the debounced
  // callback instead of the stale ones captured when the effect ran.
  // Updated in an effect (not during render) — React 19 forbids
  // mutating a ref while rendering.
  const latest = useRef({ searchParams, pathname, router });
  useEffect(() => {
    latest.current = { searchParams, pathname, router };
  });

  function setParam(key: string, value: string) {
    const { searchParams: currentParams, pathname: currentPathname, router: currentRouter } = latest.current;
    const params = new URLSearchParams(currentParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // any filter change resets to page 1
    currentRouter.replace(`${currentPathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const currentQ = latest.current.searchParams.get("q") ?? "";
      if (query !== currentQ) {
        setParam("q", query);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={signupsCopy.filters.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-xs"
        aria-label={signupsCopy.filters.searchPlaceholder}
      />
      <Select
        aria-label="Page"
        defaultValue={searchParams.get("source") ?? "all"}
        onChange={(event) => setParam("source", event.target.value)}
        className="w-auto"
      >
        <option value="all">{signupsCopy.filters.sourceAll}</option>
        {SIGNUP_SOURCES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
