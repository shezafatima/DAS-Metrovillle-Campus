import { categoryLabel, type NewsCategoryKey } from "@/lib/news/categories";

/**
 * The post's category as a small plain-text pill (not a link). One style for
 * every category and every place it shows: navy text on white. The label stays
 * in English for Urdu posts; `dir` only decides which corner it sits in when
 * `overlay` is set (top-left for LTR, top-right for RTL).
 */
export function CategoryLabel({
  category,
  dir = "ltr",
  overlay = false,
}: {
  category: NewsCategoryKey;
  dir?: "ltr" | "rtl";
  overlay?: boolean;
}) {
  const position = overlay ? `absolute top-3 z-10 max-w-[calc(100%-1.5rem)] ${dir === "rtl" ? "right-3" : "left-3"}` : "inline-block";
  return (
    <span
      data-testid="category-label"
      lang="en"
      dir="ltr"
      className={`${position} truncate rounded-full bg-surface px-3 py-1 font-body text-(length:--text-news-meta) font-medium leading-none text-primary shadow-sm`}
    >
      {categoryLabel(category)}
    </span>
  );
}
