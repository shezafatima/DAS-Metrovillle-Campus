import Image from "next/image";
import Link from "next/link";
import { homeContent } from "@/content/home";

/**
 * The four icon quick-links (006 US6, FR-023): Photo/Videos, Downloads and Our
 * Books to their Resources anchors, Call/Mail/Chat to Contact. The labels
 * are part of the reference tile images, so each image's alt text is its
 * label and names the link.
 */
export function QuickLinks() {
  const { label, items } = homeContent.quickLinks;
  return (
    <section aria-label={label} className="mx-auto w-full max-w-(--container-max-width) px-(--container-gutter-x) pt-(--spacing-home-links-top) pb-(--spacing-home-links-bottom)">
      <ul className="grid grid-cols-1 gap-(--spacing-home-carousel-gap) sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="block outline-none transition-opacity duration-(--motion-fast) hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring" data-testid="quick-link">
              <Image src={item.image.src} alt={item.image.alt} width={item.image.width} height={item.image.height} sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="h-auto w-full" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
