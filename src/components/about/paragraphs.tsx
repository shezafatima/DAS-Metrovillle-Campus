import { cn } from "cn";

/** A `longText` value: paragraphs separated by one blank line, one `<p>` each. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, index) => (
        <p key={index} className={cn("font-body text-body text-text", className)}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
