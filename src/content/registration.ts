import { MAX_AGE, MIN_AGE, type MotherTongue, type RegistrationStatus } from "@/lib/registration/rules";

/**
 * Student registration copy (013; Constitution VIII — copy lives in content
 * files, shaped so the 014 content feature can take it over). The admin
 * strings are in src/content/admin.ts.
 *
 * `privacy.placeholder: true` is the client-approval gate:
 * scripts/check-release-content.ts blocks a production build while it is true
 * (Constitution V, FR-031). Set it to false only when the client approves the
 * wording in `privacy.notice`.
 */

/** "12 months", "1 month". */
function months(count: number): string {
  return `${count} ${count === 1 ? "month" : "months"}`;
}

export const registrationCopy = {
  page: {
    metaTitle: "Student Registration",
    bannerTitle: "Student Registration",
    intro: "Please fill in this form to register your child for admission. Fields marked * are required.",
  },
  legends: {
    student: "Student",
    parents: "Parents",
    contact: "Contact & address",
    health: "Health",
    reference: "Reference",
    remarks: "Remarks",
  },
  labels: {
    studentName: "Student's name",
    dateOfBirth: "Date of birth",
    className: "Admission for class",
    fatherName: "Father's name",
    motherName: "Mother's name",
    fatherMobile: "Father's mobile",
    motherMobile: "Mother's mobile",
    email: "Email address",
    address: "Address",
    emergencyPhone: "Emergency contact number",
    vaccinated: "Is the student vaccinated?",
    medicalHistory: "Any medical history",
    motherTongue: "Mother tongue",
    motherTongueOther: "Mother tongue (please write it)",
    referenceName: "Reference student's name",
    referenceClass: "Reference student's class",
    referenceRelation: "Relation to the student",
    remarks: "Remarks",
    yes: "Yes",
    no: "No",
  },
  hints: {
    medicalHistory: "Allergies, conditions or medication the school should know about",
    parentMobile: "At least one parent's mobile number is required.",
    referenceGroup: "Optional. If you name a student who studies at the school, fill in all three fields.",
    phone: "For example: 03001234567",
  },
  placeholders: {
    className: "Choose a class",
    motherTongue: "Choose a language",
  },
  motherTongueOptions: {
    urdu: "Urdu",
    english: "English",
    sindhi: "Sindhi",
    punjabi: "Punjabi",
    pashto: "Pashto",
    balochi: "Balochi",
    saraiki: "Saraiki",
    other: "Other",
  } satisfies Record<MotherTongue, string>,
  statusLabels: {
    new: "New",
    contacted: "Contacted",
    admitted: "Admitted",
    not_admitted: "Not admitted",
  } satisfies Record<RegistrationStatus, string>,
  fieldErrors: {
    invalid: "Check this entry.",
    studentName: "Enter the student's full name (2 to 100 characters).",
    fatherName: "Enter the father's full name (2 to 100 characters).",
    motherName: "Enter the mother's full name (2 to 100 characters).",
    email: "Enter a valid email address.",
    dateOfBirth: "Enter the student's date of birth.",
    dateOfBirthFuture: "The date of birth cannot be in the future.",
    dateOfBirthAge: `The student must be between ${MIN_AGE} and ${MAX_AGE} years old.`,
    phone: "Enter a Pakistani mobile number, e.g. 03001234567.",
    parentMobile: "Enter at least one parent's mobile number.",
    address: "Enter the full address (10 to 300 characters).",
    className: "Please choose a class from the list.",
    motherTongue: "Choose the mother tongue.",
    motherTongueOther: "Write the mother tongue (2 to 50 characters).",
    vaccinated: "Choose Yes or No.",
    medicalHistory: "Medical history must be 1,000 characters or fewer.",
    reference: "Fill in all three reference fields, or leave them all empty.",
    referenceLength: "Use 2 to 100 characters.",
    remarks: "Remarks must be 1,000 characters or fewer.",
    consent: "Please tick the box to agree before submitting.",
  },
  banners: {
    closed: "Admissions are closed. Please check the Admission page for dates.",
    rateLimited: "Too many attempts. Please try again in a few minutes.",
    unavailable: "Something went wrong. Please try again.",
  },
  closedDefault: "Admissions are currently closed.",
  closedLink: "Back to Admission",
  submit: "Submit registration",
  sending: "Sending…",
  confirmation: {
    title: "Registration received",
    lead: "Your reference number is",
    keep: "Please keep it; the school office will ask for it. We will not send an email or SMS.",
    backLink: "Back to Admission",
  },
  privacy: {
    // Pending client approval: blocks a production build (scripts/check-release-content.ts).
    placeholder: true,
    notice: (retentionMonths: number) =>
      "The information you provide on this form, including your child's health details and the details of any student you name as a reference, " +
      "is used only to process this admission registration. It can be seen only by the school's administration. " +
      "It is never sold or shared with anyone else, apart from the service providers that host this website and its database on the school's behalf. " +
      `We keep registrations for ${months(retentionMonths)} after submission, after which they are deleted automatically. ` +
      "Deleted records are permanently removed within 30 days, although backup copies may be kept for a short time before they are overwritten. " +
      "You will not receive an email or SMS; please note the reference number shown after you submit.",
    consent: "I am the parent or guardian of this student and agree to the school using this information as described above.",
  },
} as const;
