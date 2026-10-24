/**
 * Class strings shared by the public forms (contact 008, careers 012,
 * registration 013) so the three cannot drift apart. All values come from
 * named tokens. The error class sets the body font explicitly: the message
 * must never fall back to the page's serif (013 research §5a).
 */
export const INPUT_CLASS =
  "h-(--spacing-signup-input-height) w-full rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 font-body text-(length:--text-signup-input) text-foreground outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring";

export const TEXTAREA_CLASS =
  "h-(--spacing-contact-textarea-height) w-full resize-none rounded-signup-input border border-signup-input-border bg-signup-input-bg px-4 py-2 font-body text-(length:--text-signup-input) text-foreground outline-none placeholder:text-signup-input-text focus-visible:ring-2 focus-visible:ring-ring";

/** The registration address box: about two rows, not the 150px contact-form message box. */
export const TEXTAREA_COMPACT_CLASS = TEXTAREA_CLASS.replace("h-(--spacing-contact-textarea-height)", "h-(--spacing-registration-address-height)");

export const SELECT_CLASS = `${INPUT_CLASS} appearance-auto`;

/** Error text and banner use --color-error-strong: the reference --color-error is 3.68:1 on white (below WCAG AA). */
export const ERROR_CLASS = "rounded-signup-input bg-signup-input-bg px-2 py-1 text-left font-body text-xs font-bold text-error-strong";

export const BANNER_CLASS = "rounded-md bg-white px-3 py-2 text-center font-body text-sm font-bold text-error-strong";

/**
 * The red call-to-action button (white on --color-cta) measures 3.68:1, below the 4.5:1 that axe
 * requires for 14px text (013 FR-010). The registration form therefore uses the navy
 * --color-cta-hover for the idle state and --color-primary on hover; the contact and careers forms keep
 * the reference red. Recorded in research/design-tokens.md "Registration form (013)".
 */
export const ACCESSIBLE_SUBMIT_CLASS =
  "rounded-signup-button bg-cta-hover px-6 py-3 font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-primary disabled:opacity-70";

export const SUBMIT_CLASS =
  "rounded-signup-button bg-cta px-6 py-3 font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-cta-hover disabled:opacity-70";

/*
 * Shared form UI (026): the student registration form and the careers form. These are NEW exports so the
 * contact form, which still uses the classes above, is unchanged until it adopts them.
 *
 * - Outline is --color-text-muted (#747474, 4.7:1 on white) so the field boundary passes 3:1.
 * - Focus: a 2px navy outline plus a soft gold ring (the ring is decoration; the navy outline is 13.8:1).
 * - An invalid field keeps its message colour, --color-error-strong, on its outline.
 * - Every control is at least 44px tall (min-h-11); focused controls scroll clear of the sticky header
 *   (and the registration progress bar) through --form-scroll-offset.
 */
const FORM_FIELD_BASE =
  "min-h-11 w-full scroll-mt-(--form-scroll-offset) rounded-lg border border-text-muted bg-signup-input-bg font-body text-(length:--text-signup-input) text-foreground transition-shadow duration-(--motion-fast) placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-primary focus-visible:ring-4 focus-visible:ring-gold/40 aria-invalid:border-error-strong aria-invalid:outline-error-strong";

export const FORM_INPUT_CLASS = `${FORM_FIELD_BASE} h-(--spacing-signup-input-height) px-4`;
/** For a field with a decorative icon on its left: the text starts after the icon, never under it. */
export const FORM_INPUT_ICON_CLASS = `${FORM_FIELD_BASE} h-(--spacing-signup-input-height) pr-4 pl-11`;
export const FORM_TEXTAREA_CLASS = `${FORM_FIELD_BASE} h-(--spacing-contact-textarea-height) resize-none px-4 py-3`;
export const FORM_TEXTAREA_COMPACT_CLASS = FORM_TEXTAREA_CLASS.replace("h-(--spacing-contact-textarea-height)", "h-(--spacing-registration-address-height)");
export const FORM_SELECT_CLASS = `${FORM_INPUT_CLASS} appearance-auto`;

export const FORM_LABEL_CLASS = "font-body text-(length:--text-signup-input) font-bold text-foreground";
export const FORM_HINT_CLASS = "font-body text-xs text-foreground";

/** The decorative icon inside a field (left side). Never clickable. */
export const FORM_FIELD_ICON_CLASS = "pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-primary";

/** A radio or checkbox row: the whole row is the tap target, 44px tall, in navy. */
export const FORM_CHOICE_LABEL_CLASS = "flex min-h-11 cursor-pointer items-center gap-3 font-body text-sm text-foreground";
export const FORM_CHOICE_INPUT_CLASS = "size-5 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Navy at rest (white on navy, 13.8:1), gold with navy text on hover and keyboard focus (9.8:1). Disabled while
 * submitting, so it cannot be sent twice.
 */
export const FORM_SUBMIT_CLASS =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cta-hover px-6 py-3 font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-gold hover:text-primary focus-visible:bg-gold focus-visible:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-cta-hover disabled:hover:text-white";
