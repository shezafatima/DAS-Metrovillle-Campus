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
