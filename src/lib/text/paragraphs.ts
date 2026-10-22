/**
 * Plain paragraphs from admin text (014b): paragraphs are separated by one or
 * more blank lines, and a single line break inside a paragraph is folded into
 * a space. Used for an Examination block's body and a syllabus group's intro.
 * The result is text only: React escapes it, so markup typed by an admin is
 * shown literally and never interpreted.
 */
export function toParagraphs(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
    .filter((paragraph) => paragraph !== "");
}
