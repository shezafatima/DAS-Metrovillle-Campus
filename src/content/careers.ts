import { CV_MAX_LABEL } from "@/lib/careers/cv-limits";
import { CAREERS_REAPPLY_WINDOW_DAYS } from "@/lib/careers/rules";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

/** `"2026-11-01"` → `"1 November 2026"`. The refusal message shows the date the person may apply again. */
export function formatReapplyDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/**
 * Careers page copy (Constitution VIII/IX — copy lives in content files).
 * Wording marked `placeholder: true` is not client-approved: the intro is a
 * placeholder until the client supplies it (the privacy notice is approved), and
 * `scripts/check-release-content.ts` blocks a production build while the
 * privacy notice is still one (Constitution V).
 */
export const careersCopy = {
  banner: {
    title: "Careers",
    breadcrumbHome: "Home",
  },
  intro: {
    placeholder: true,
    heading: "Join Dar-e-Arqam Schools, Metroville Campus",
    paragraphs: [
      "We are always glad to hear from committed teachers and staff who want to help our students learn and grow.",
      "Tell us a little about yourself and attach your CV. Our team will review every application.",
    ],
  },
  form: {
    heading: "Apply now",
    placeholders: {
      name: "Full name",
      email: "Email",
      phone: "Mobile number",
      qualification: "Highest qualification",
    },
    cvLabel: `Choose your CV (PDF, max ${CV_MAX_LABEL})`,
    cvChosen: (fileName: string) => `Selected: ${fileName}`,
    submit: "Apply",
    sending: "Sending…",
  },
  privacy: {
    // Approved by the client on 2026-10-09 (the wording below, unchanged).
    placeholder: false,
    notice:
      "Your details and CV are used only to consider your application and are kept for a limited time. They are visible only to authorised school staff.",
    consentLabel: "I have read the privacy notice and agree to my details being used to consider my application.",
  },
  success: {
    title: "Thank you for applying!",
    body: "We have received your application. We will contact you if there is a suitable opportunity.",
  },
  errors: {
    alreadyApplied: (reapplyFrom: string) =>
      `You applied recently. You can apply again from ${formatReapplyDate(reapplyFrom)}.`,
    rateLimited: "Too many attempts. Please try again shortly.",
    tryAgain: "We couldn't save your application just now. Please try again.",
  },
  fieldErrors: {
    name: "Enter your full name.",
    nameTooLong: "Name must be 100 characters or fewer.",
    email: "Enter a valid email address.",
    phone: "Enter a Pakistani mobile number, e.g. 03001234567.",
    qualification: "Enter your highest qualification.",
    qualificationTooLong: "Qualification must be 150 characters or fewer.",
    consent: "Please tick the box to agree before applying.",
    cv: {
      missing: "Choose your CV as a PDF file.",
      notPdf: "Your CV must be a PDF file.",
      tooLarge: `Your CV must be ${CV_MAX_LABEL} or smaller.`,
      empty: "Your CV file is empty.",
      many: "Attach one PDF only.",
    },
  },
  windowDays: CAREERS_REAPPLY_WINDOW_DAYS,
} as const;
