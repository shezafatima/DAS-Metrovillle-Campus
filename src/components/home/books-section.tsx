import { existsSync } from "node:fs";
import path from "node:path";
import { homeContent } from "@/content/home";
import { cn } from "cn";
import { RollingStrip } from "./rolling-strip";
import { SectionHeading } from "./section-heading";

type Cover = (typeof homeContent.books.covers)[number];

// Which of the fixed covers have been added to public/ yet. In production
// this is checked once per server process (the files only change with a
// deploy); in development on every render, so a cover dropped into public/
// shows without restarting the dev server.
let cached: Cover[] | null = null;
function availableCovers(): Cover[] {
  if (cached && process.env.NODE_ENV === "production") return cached;
  cached = homeContent.books.covers.filter((cover) => existsSync(path.join(process.cwd(), "public", cover.src)));
  return cached;
}

/**
 * "Books" (006 FR-011): a full-width navy section. The heading and supporting
 * text (white, left-aligned) are on the left from 1024px, with the book covers
 * rolling on the right (stacked below 1024px: text first). The covers are a
 * fixed set of up to 10 files in public/images/home/books/ (owner's decision:
 * not admin-managed); covers not yet added are left out. With none, the cover
 * strip is not drawn and the text takes the whole section.
 */
export function BooksSection() {
  const covers = availableCovers();
  const { heading, line } = homeContent.books;

  return (
    <section aria-labelledby="books-heading" className="overflow-x-clip bg-primary py-(--spacing-home-band-y)" data-testid="books">
      <div className={cn("mx-auto grid max-w-(--container-max-width) items-center gap-10 px-(--container-gutter-x)", covers.length > 0 && "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12")}>
        <SectionHeading id="books-heading" heading={heading} line={line} tone="light" divider={false} className="items-start text-left" />
        {covers.length > 0 && <RollingStrip label={heading} items={covers.map(({ id, src, alt }) => ({ id, src, alt }))} />}
      </div>
    </section>
  );
}
