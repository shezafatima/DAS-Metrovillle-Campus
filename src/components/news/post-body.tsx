/**
 * Renders a post's already-sanitised body HTML (src/lib/news/sanitize.ts
 * ran at save time — never re-sanitised on the client). `.prose-news`
 * (globals.css) is the one typography ruleset shared with the admin
 * editor, so what the admin sees while writing is what visitors see.
 */
export function PostBody({ bodyHtml, language }: { bodyHtml: string; language: "en" | "ur" }) {
  const dir = language === "ur" ? "rtl" : "ltr";
  const urduFont = language === "ur" ? "font-body-urdu" : "";

  return (
    <div
      dir={dir}
      className={`prose-news ${urduFont}`}
      // bodyHtml was sanitised server-side on save (src/lib/news/sanitize.ts); never re-sanitised client-side
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}
