import { NotFoundContent } from "@/components/site-shell/not-found-content";

// The "nearest parent not-found boundary" (Next.js docs, file-conventions
// /not-found.md) for any notFound() thrown from a page nested under this
// route group — e.g. src/app/(public)/news/[slug]/page.tsx for a draft,
// future-dated, or deleted post (FR-019). No PublicShell wrapper here:
// (public)/layout.tsx already rendered one around this boundary (a
// layout renders regardless of whether its child page 404s), so wrapping
// again would double the header and footer. See src/app/not-found.tsx
// for the counterpart that handles URLs matching no route at all.
export default function PublicNotFound() {
  return <NotFoundContent />;
}
