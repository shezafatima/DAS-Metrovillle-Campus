"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { newsCopy } from "@/content/admin";
import { NEWS_CATEGORIES } from "@/lib/news/categories";

const DEBOUNCE_MS = 300;

/**
 * Search + status + category filters for the admin news table
 * (FR-011, FR-039). Filters live in the URL's search params so a page
 * reload or a shared link keeps them, and so `NewsPagination` links
 * can carry them forward.
 */
export function NewsTableFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // any filter change resets to page 1
    router.replace(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam("q", query);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setParam intentionally excluded: it would re-debounce on every searchParams change
  }, [query]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        placeholder={newsCopy.filters.searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="max-w-xs"
        aria-label={newsCopy.filters.searchPlaceholder}
      />
      <Select
        aria-label="Status"
        defaultValue={searchParams.get("status") ?? "all"}
        onChange={(event) => setParam("status", event.target.value)}
        className="w-auto"
      >
        <option value="all">{newsCopy.filters.statusAll}</option>
        <option value="draft">{newsCopy.filters.statusDraft}</option>
        <option value="published">{newsCopy.filters.statusPublished}</option>
      </Select>
      <Select
        aria-label="Category"
        defaultValue={searchParams.get("category") ?? "all"}
        onChange={(event) => setParam("category", event.target.value)}
        className="w-auto"
      >
        <option value="all">{newsCopy.filters.categoryAll}</option>
        {NEWS_CATEGORIES.map((c) => (
          <option key={c.key} value={c.key}>
            {c.label}
          </option>
        ))}
      </Select>
    </div>
  );
}
