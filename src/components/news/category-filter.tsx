import Link from "next/link";
import { NEWS_CATEGORIES } from "@/lib/news/categories";
import { newsPublicCopy } from "@/content/news";

/**
 * "All" + one link per fixed category (FR-038, FR-037). The reference
 * itself has no such filter row — categories there only appear as a
 * label in each card's meta line and via direct category URLs; this
 * row is the spec's addition for discoverability (recorded in spec.md
 * "Deviations from the Reference").
 */
export function CategoryFilter({ active }: { active?: string }) {
  return (
    <nav aria-label="Filter by category" className="mb-6 flex flex-wrap gap-3">
      <Link
        href="/news"
        aria-current={!active ? "page" : undefined}
        className={`font-body text-sm ${!active ? "font-bold text-primary" : "text-text-muted hover:text-primary"}`}
      >
        {newsPublicCopy.allCategories}
      </Link>
      {NEWS_CATEGORIES.map((c) => (
        <Link
          key={c.key}
          href={`/news/${c.key}`}
          aria-current={active === c.key ? "page" : undefined}
          className={`font-body text-sm ${active === c.key ? "font-bold text-primary" : "text-text-muted hover:text-primary"}`}
        >
          {c.label}
        </Link>
      ))}
    </nav>
  );
}
