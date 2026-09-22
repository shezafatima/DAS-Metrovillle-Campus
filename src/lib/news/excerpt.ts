/**
 * Derives a public card excerpt from a post's plain text (FR-017,
 * research.md §2). Never edited directly — recomputed on every save.
 */
export function excerptFrom(text: string, max = 160): string {
  if (text.length <= max) return text;
  const truncated = text.slice(0, max);
  const lastSpace = truncated.lastIndexOf(" ");
  const cut = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
  return `${cut.trimEnd()}…`;
}
