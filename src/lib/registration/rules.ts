/**
 * Fixed rules for student registrations (013). The constants are written only
 * here (tasks.md working rules); everything else imports them.
 */

/** A deleted registration can be restored for this many days (ADR-0012). */
export const REGISTRATION_DELETE_GRACE_DAYS = 30;

/** Age on the submission day, in whole years, inclusive (FR-002). */
export const MIN_AGE = 2;
export const MAX_AGE = 18;

/** The reference shown to the parent: no 0/O or 1/I/L, so it can be read aloud. */
export const REFERENCE_LENGTH = 8;
export const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const REGISTRATION_STATUSES = ["new", "contacted", "admitted", "not_admitted"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];

export const MOTHER_TONGUES = ["urdu", "english", "sindhi", "punjabi", "pashto", "balochi", "saraiki", "other"] as const;
export type MotherTongue = (typeof MOTHER_TONGUES)[number];
