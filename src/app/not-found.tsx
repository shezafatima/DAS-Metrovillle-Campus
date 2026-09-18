import Link from "next/link";
import { PublicShell } from "@/components/site-shell/public-shell";

// This is the root not-found.tsx, which Next.js requires to stay at the
// app root to catch every unmatched URL — it can't live inside the
// (public) route group. It renders its own PublicShell wrapper so a 404
// still gets the public header/footer (specs/002-foundation/research.md
// §3). Admin 404s are out of scope for this feature.
export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-(--container-max-width) flex-col items-start gap-4 px-(--container-gutter-x) py-section-gap-lg">
        <h1 className="font-heading text-h3 text-text">Page not found</h1>
        <p className="font-body text-body text-text-muted">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="font-body text-body text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Back to home
        </Link>
      </div>
    </PublicShell>
  );
}
