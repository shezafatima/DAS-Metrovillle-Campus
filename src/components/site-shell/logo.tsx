import Image from "next/image";
import Link from "next/link";

// public/images/logo.svg is 1974x797 intrinsic (~2.48:1). The same artwork is
// used in every header state (also over the transparent home header). The
// height is a modest responsive scale and fits inside --header-h.
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
        className="h-11 w-auto md:h-12 lg:h-14"
      />
    </Link>
  );
}
