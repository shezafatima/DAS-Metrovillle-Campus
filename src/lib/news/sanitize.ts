import sanitizeHtml from "sanitize-html";

/**
 * Server-side body sanitiser (research.md §2, FR-035). This is the
 * authoritative control — the editor's own extension allowlist
 * (rich-text-editor.tsx) is defence-in-depth, not the guarantee.
 *
 * Allowlist: headings (h2/h3 only — no h1, which is reserved for the
 * page's own title), paragraphs, bold/italic, lists, links, line
 * breaks. Everything else (script, style, img, table, iframe, class/
 * style/onclick attributes, unsafe link schemes) is stripped.
 */
const ALLOWED_TAGS = ["h2", "h3", "p", "strong", "em", "ul", "ol", "li", "a", "br"];
const ALLOWED_SCHEMES = ["http", "https", "mailto"];

function isSameOrigin(href: string, origin: string): boolean {
  try {
    return new URL(href, origin).origin === origin;
  } catch {
    return false;
  }
}

export interface SanitizedBody {
  /** Sanitised HTML, safe to store and to render with dangerouslySetInnerHTML. */
  html: string;
  /** Plain text extracted from the sanitised HTML, whitespace-collapsed — used for the empty-body check and the excerpt. */
  text: string;
}

export function sanitizeBody(rawHtml: string): SanitizedBody {
  // Read BETTER_AUTH_URL directly (not through getEnv()) — this is a
  // pure formatting decision (does this link leave the site?), not a
  // reason to require the whole app env schema to be valid.
  let origin: string;
  try {
    origin = new URL(process.env.BETTER_AUTH_URL ?? "").origin;
  } catch {
    origin = "";
  }

  const html = sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    // rel/target are allowed here because transformTags below sets them
    // itself (never from user input) — allowedAttributes is applied
    // *after* transformTags, so both must be listed or sanitize-html
    // strips the values transformTags just added.
    allowedAttributes: { a: ["href", "rel", "target"] },
    allowedSchemes: ALLOWED_SCHEMES,
    // Anything not in ALLOWED_TAGS is dropped but its text content is
    // kept (default "discard" behaviour keeps children) — this is what
    // makes pasting from Word degrade to plain paragraphs instead of
    // disappearing.
    transformTags: {
      // Rebuild attribs from scratch (never trust user-supplied rel/
      // target) — href is kept as-is; rel/target are added only for
      // links that leave the site.
      a: (tagName, attribs) => {
        const href = attribs.href;
        const isExternal = Boolean(href) && !isSameOrigin(href, origin);
        return {
          tagName,
          attribs: {
            ...(href ? { href } : {}),
            ...(isExternal ? { rel: "noopener noreferrer", target: "_blank" } : {}),
          },
        };
      },
    },
  });

  const text = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  return { html, text };
}
