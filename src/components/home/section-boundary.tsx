import { unstable_rethrow } from "next/navigation";

/**
 * Renders one async home section, or its fallback if that section's data
 * cannot be read (006 FR-027, research R5): a failure in one section never
 * stops another from showing, and the page never becomes an error page.
 * Next's own control-flow errors pass through.
 *
 * `render` is the section's async function itself, awaited here, so a
 * failure while reading its data lands in this try (passing `<Section />`
 * would render it later, outside the try).
 */
export async function SectionBoundary({
  name,
  render,
  fallback = null,
}: {
  name: string;
  render: () => Promise<React.ReactNode>;
  fallback?: React.ReactNode;
}) {
  let content: React.ReactNode = fallback;
  try {
    content = await render();
  } catch (error) {
    unstable_rethrow(error);
    console.warn(JSON.stringify({ at: new Date().toISOString(), kind: "home", type: "section_failed", section: name }));
  }
  return <>{content}</>;
}
