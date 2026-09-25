/**
 * One-line inbox preview of a message body (data-model.md "MessageRow").
 * Operates on code points, not UTF-16 code units, so an emoji or other
 * astral character is never split in half.
 */
export function toPreview(body: string, max = 100): string {
  const collapsed = body.replace(/\s+/g, " ").trim();
  const codePoints = Array.from(collapsed);
  if (codePoints.length <= max) return collapsed;
  return `${codePoints.slice(0, max).join("").trimEnd()}…`;
}
