/**
 * Whether the registration form at /admission/register exists (020 FR-018).
 * Off until feature 013 builds the form; 013 deletes this constant. The only
 * reader is isAdmissionApplyOpen() (src/lib/admission/server.ts).
 */
export const registrationFormExists = false;
