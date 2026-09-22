import { NEWS_CATEGORY_KEYS } from "./categories";

/**
 * Slugs (spec "address") — research.md §4. Urdu letters are kept so an
 * Urdu title produces a readable, non-fallback address; everything
 * other than letters/digits collapses to a single hyphen.
 */

export const RESERVED_SLUGS: readonly string[] = [...NEWS_CATEGORY_KEYS, "page"];

const MAX_SLUG_LENGTH = 120;

/** Matches a normalised slug: letter/digit runs separated by single hyphens. */
export const SLUG_PATTERN = /^[\p{L}\p{N}]+(-[\p{L}\p{N}]+)*$/u;

/**
 * Normalises a title into a slug (FR-005): NFKC-normalise, lower-case,
 * keep Unicode letters/digits, collapse everything else to `-`, trim
 * leading/trailing hyphens, cap the length. Returns `""` when nothing
 * usable survives (e.g. an emoji-only or symbol-only title) — callers
 * fall back to `fallbackSlug()` in that case.
 */
export function slugify(title: string): string {
  const normalised = title.normalize("NFKC").toLowerCase();
  const collapsed = normalised.replace(/[^\p{L}\p{N}]+/gu, "-");
  const trimmed = collapsed.replace(/^-+|-+$/g, "");
  if (trimmed.length <= MAX_SLUG_LENGTH) return trimmed;
  // Cut at the boundary and trim any hyphen the cut left dangling.
  return trimmed.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
}

/**
 * `post-<yyyymmdd>-<4 base36 chars>` — used when `slugify()` yields
 * nothing usable (FR-005's fallback clause).
 */
export function fallbackSlug(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return `post-${y}${m}${d}-${suffix}`;
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug.toLowerCase());
}

/**
 * Decodes a raw `[slug]` route param. Verified against this Next.js
 * version (16.3, Turbopack) with a live request: unlike plain-ASCII
 * segments, a dynamic segment containing percent-encoded UTF-8 (e.g. an
 * Urdu slug — browsers always percent-encode non-ASCII URL path
 * segments) arrives in `params` still encoded, as the literal
 * "%D8%B3%D8..." text, not the decoded characters. Every reader of a
 * news `[slug]` must decode through this function before comparing
 * against a stored slug or checking isCategoryKey/isReservedSlug — a
 * plain ASCII slug decodes to itself, so this is always safe to call.
 * A malformed percent-sequence (never produced by <Link>, but a crafted
 * URL could send one) falls back to the raw value rather than throwing.
 */
export function decodeSlugParam(rawSlug: string): string {
  try {
    return decodeURIComponent(rawSlug);
  } catch {
    return rawSlug;
  }
}
