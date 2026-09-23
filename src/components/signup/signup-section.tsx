import { SignupForm } from "@/components/signup/signup-form";
import { signupCopy } from "@/content/signup";
import type { SignupSource } from "@/lib/signup/sources";

export interface SignupSectionProps {
  source: SignupSource;
  /** Cross-page anchor id owned by this spec (docs/architecture.md); 006/009 may link to it. */
  id?: string;
}

/**
 * The reusable signup band (FR-001–FR-002; contracts/signup-section.md).
 * Server Component — the only client code is the form itself
 * (Constitution VI). Placed on the Home placeholder in this feature;
 * 006 (Home) and 009 (Resources) place the same component with their
 * own `source`.
 */
export function SignupSection({ source, id = "signup" }: SignupSectionProps) {
  const { heading, supporting, note } = signupCopy;

  return (
    <section id={id} aria-labelledby="signup-heading" className="bg-signup-band py-(--spacing-signup-band-y)">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col items-center gap-4 px-(--container-gutter-x) text-center">
        <h2
          id="signup-heading"
          data-placeholder={heading.placeholder || undefined}
          className="font-heading text-h3 font-bold text-white"
        >
          {heading.before}
          <span className="text-signup-highlight">{heading.highlight}</span>
          {heading.after}
        </h2>
        <p
          data-placeholder={supporting.placeholder || undefined}
          className="font-heading text-(length:--text-signup-supporting) leading-(--text-signup-supporting--line-height) font-bold text-signup-supporting"
        >
          {supporting.text}
        </p>
        <SignupForm source={source} />
        <p data-placeholder={note.placeholder || undefined} className="font-body text-sm text-signup-supporting">
          {note.text}
        </p>
      </div>
    </section>
  );
}
