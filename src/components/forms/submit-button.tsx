import { LoaderCircle } from "lucide-react";
import { FORM_SUBMIT_CLASS } from "./public-form-styles";

/**
 * The shared submit button: while `submitting` it shows the submitting label with a spinner (still when the
 * visitor prefers reduced motion) and is disabled.
 */
export function SubmitButton({ submitting, label, submittingLabel }: { submitting: boolean; label: string; submittingLabel: string }) {
  return (
    <button type="submit" disabled={submitting} aria-busy={submitting || undefined} className={FORM_SUBMIT_CLASS}>
      {submitting && <LoaderCircle aria-hidden="true" focusable="false" className="size-5 animate-spin motion-reduce:animate-none" />}
      {submitting ? submittingLabel : label}
    </button>
  );
}
