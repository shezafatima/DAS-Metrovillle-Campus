"use client";

import { AdminListFilters } from "@/components/admin/admin-list-filters";
import { signupsCopy } from "@/content/admin";
import { SIGNUP_SOURCES } from "@/lib/signup/sources";

export function SignupsTableFilters() {
  return (
    <AdminListFilters
      searchPlaceholder={signupsCopy.filters.searchPlaceholder}
      select={{
        param: "source",
        label: "Page",
        allLabel: signupsCopy.filters.sourceAll,
        options: SIGNUP_SOURCES.map((s) => ({ value: s.key, label: s.label })),
      }}
    />
  );
}
