import { PublicShell } from "@/components/site-shell/public-shell";
import { NotFoundContent } from "@/components/site-shell/not-found-content";

// This is the root not-found.tsx, which Next.js requires to stay at the
// app root to catch every unmatched URL — it can't live inside the
// (public) route group. It renders its own PublicShell wrapper so a 404
// still gets the public header/footer (specs/002-foundation/research.md
// §3).
//
// This file only handles URLs that never matched ANY route at all (no
// (public)/layout.tsx or admin/layout.tsx rendered). A notFound() thrown
// from a page already nested under (public)/ is caught by
// src/app/(public)/not-found.tsx instead — that page's own layout has
// already rendered PublicShell once, so re-wrapping here would double
// the header/footer (found via news/[slug]'s notFound() call — the
// first page in the app to actually trigger this path). Admin 404s are
// out of scope for this feature.
export default function NotFound() {
  return (
    <PublicShell>
      <NotFoundContent />
    </PublicShell>
  );
}
