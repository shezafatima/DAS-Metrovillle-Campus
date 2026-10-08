import { cn } from "cn";
import { HeadingStroke } from "./heading-stroke";

/**
 * The reference's shared section heading and supporting line (006,
 * design-tokens "Home sections — Shared section heading and line"): Poppins
 * 700 heading (fluid 24.84 → 29.61 → 30px) over a softLINKS 20px line,
 * centred. `tone="light"` is the white variant used on the Books and
 * Progress Dashboard image bands, with the short divider under the line.
 */
export function SectionHeading({
  id,
  heading,
  line,
  tone = "dark",
  stroke = false,
  className,
}: {
  id: string;
  heading: string;
  line?: string;
  tone?: "dark" | "light";
  /** A yellow pencil stroke that draws itself under the heading when it scrolls into view. */
  stroke?: boolean;
  className?: string;
}) {
  const light = tone === "light";
  return (
    <div className={cn("flex flex-col items-center gap-(--spacing-home-heading-gap) text-center", className)}>
      <div className={cn(stroke && "flex max-w-full flex-col items-stretch")}>
      <h2
        id={id}
        className={cn(
          "font-bold font-heading text-(length:--text-home-heading-sm) leading-(--text-home-heading--line-height) md:text-(length:--text-home-heading-md) lg:text-(length:--text-home-heading)",
          light ? "text-white" : "text-(--color-home-heading)",
        )}
      >
        {heading}
      </h2>
      {stroke && <HeadingStroke />}
      </div>
      {line && (
        <p className={cn("font-body text-(length:--text-home-subheading) leading-(--text-home-subheading--line-height)", light ? "text-white" : "text-text")}>{line}</p>
      )}
      {light && <span aria-hidden="true" className="h-0.5 w-(--spacing-home-divider-width) max-w-full bg-white" />}
    </div>
  );
}
