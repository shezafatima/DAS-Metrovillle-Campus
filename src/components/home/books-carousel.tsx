import { existsSync } from "node:fs";
import path from "node:path";
import Image from "next/image";
import { homeContent } from "@/content/home";
import { BAND_CAROUSEL_PER_VIEW, Carousel } from "./carousel";
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
 * "Dar-e-Arqam Books" (006 FR-011): a fixed section with a fixed set of 10
 * book covers from public/images/home/books/ (owner's decision: not
 * admin-managed). Shown as the reference's carousel on its blue band: 1 cover
 * at a time below 1024px, 5 from 1024px, 4 from 1200px, autoplaying with
 * arrows. Covers not yet added are left out; with none, the section hides.
 */
export function BooksCarousel() {
  const covers = availableCovers();
  if (covers.length === 0) return null;
  const { heading, line, background } = homeContent.books;

  return (
    <section aria-labelledby="books-heading" className="relative overflow-hidden bg-(--color-home-muted-band) py-(--spacing-home-band-y)" data-testid="books">
      <Image src={background.src} alt={background.alt} fill sizes="100vw" className="object-cover" />
      <div className="relative mx-auto flex max-w-(--container-max-width) flex-col gap-8 px-(--container-gutter-x)">
        <SectionHeading id="books-heading" heading={heading} line={line} tone="light" />
        <Carousel label={heading} perViewClass={BAND_CAROUSEL_PER_VIEW} autoplayMs={5000} tone="dark">
          {covers.map((cover) => (
            <div key={cover.id} className="relative h-(--spacing-home-book-height) w-full" data-testid="book-cover">
              <Image src={cover.src} alt={cover.alt} fill sizes="(min-width: 1200px) 25vw, (min-width: 1024px) 20vw, 100vw" className="object-contain" />
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
