import Image from "next/image";
import Link from "next/link";

// public/images/logo.svg is 1974x797 intrinsic (~2.48:1). No dedicated
// header-logo crop or measured pixel size exists in research/design-tokens.md
// or research/tokens/*.json — only full-page captures are available, at a
// resolution too extreme to reliably pixel-measure the header logo — so its
// rendered height uses a standard responsive header scale (growing with the
// viewport, same intent as the reference) rather than a fabricated exact
// value. Revisit if a dedicated header/footer crop is supplied later.
export function Logo() {
  return (
    <Link
      href="/"
      className="flex shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Image
        src="/images/logo.svg"
        alt="Dar-e-Arqam School Metroville Campus"
        width={1974}
        height={797}
        priority
        className="h-14 w-auto sm:h-16 lg:h-16 xl:h-20"
      />
    </Link>
  );
}
