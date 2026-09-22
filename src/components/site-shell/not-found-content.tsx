import Link from "next/link";

/**
 * Shared "page not found" body, used by both the root not-found.tsx
 * (for URLs that never matched any route group) and (public)/not-found.tsx
 * (the nearest boundary for a notFound() thrown from within a page
 * already nested under (public)/layout.tsx's PublicShell) — see the
 * comment in each of those files for why two are needed.
 */
export function NotFoundContent() {
  return (
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
  );
}
