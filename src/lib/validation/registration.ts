import { z } from "zod";
import { registrationCopy } from "@/content/registration";
import { normalisePakistaniMobile } from "@/lib/phone";
import { ageOn } from "@/lib/registration/age";
import { MAX_AGE, MIN_AGE, MOTHER_TONGUES, type MotherTongue } from "@/lib/registration/rules";
import { isCalendarDate } from "@/lib/settings/schema";
import { collapseInlineSpaces, collapseSpaces } from "@/lib/validation/field-errors";

/**
 * The student registration schema (013, research §3–§5), shared by the form
 * (early messages) and the public route (authoritative). It is built per
 * request because two rules depend on server data: the class must be in the
 * CURRENT Settings list, and the age is measured on today's date in Pakistan.
 *
 * Text is cleaned first (trim, collapse spaces, NFC) and the rules run on the
 * cleaned value. Markup is stored as typed and always rendered as text. Keys
 * the schema does not list (a submission date, a status, a reference) are
 * dropped (FR-003).
 */

const messages = registrationCopy.fieldErrors;

/** The request keys in page order: where focus goes first, and the order errors are looked up in. */
export const REGISTRATION_FIELD_ORDER = [
  "studentName",
  "dateOfBirth",
  "className",
  "fatherName",
  "motherName",
  "fatherMobile",
  "motherMobile",
  "email",
  "address",
  "emergencyPhone",
  "vaccinated",
  "medicalHistory",
  "motherTongue",
  "motherTongueOther",
  "referenceName",
  "referenceClass",
  "referenceRelation",
  "remarks",
  "consent",
] as const;

export type RegistrationField = (typeof REGISTRATION_FIELD_ORDER)[number];

/** What the browser sends (every value as typed). */
export interface RegistrationInput {
  studentName: string;
  fatherName: string;
  motherName: string;
  email: string;
  dateOfBirth: string;
  fatherMobile: string;
  motherMobile: string;
  address: string;
  emergencyPhone: string;
  className: string;
  motherTongue: string;
  motherTongueOther: string;
  vaccinated: string;
  medicalHistory: string;
  referenceName: string;
  referenceClass: string;
  referenceRelation: string;
  remarks: string;
  consent: boolean | string;
}

/** What is stored: cleaned, normalised and nested the way the model wants it. */
export interface RegistrationOutput {
  studentName: string;
  fatherName: string;
  motherName: string;
  email: string;
  dateOfBirth: string;
  fatherMobile: string | null;
  motherMobile: string | null;
  address: string;
  emergencyPhone: string;
  className: string;
  motherTongue: MotherTongue;
  motherTongueOther: string | null;
  vaccinated: boolean;
  medicalHistory: string | null;
  referenceStudent: { name: string; className: string; relation: string } | null;
  remarks: string | null;
  consent: true;
}

/** A missing key is the same as an empty one. */
const text = z.preprocess((value) => (value === undefined || value === null ? "" : value), z.string({ error: messages.invalid }));

/** A single-line text with the 2–max rule. */
function line(min: number, max: number, message: string) {
  return z
    .preprocess((value) => (value === undefined || value === null ? "" : value), z.string({ error: message }))
    .transform((value) => collapseSpaces(value).normalize("NFC"))
    .pipe(z.string().min(min, message).max(max, message));
}

/** A multi-line text; empty is allowed when `min` is 0 and is stored as null by the final transform. */
function area(min: number, max: number, message: string) {
  return z
    .preprocess((value) => (value === undefined || value === null ? "" : value), z.string({ error: message }))
    .transform((value) => collapseInlineSpaces(value).normalize("NFC"))
    .pipe(z.string().min(min, message).max(max, message));
}

/** Light cleaned string, checked together with its siblings in superRefine. */
const cleaned = text.transform((value) => collapseSpaces(value).normalize("NFC"));

function dateOfBirth(today: string) {
  return text
    .transform((value) => value.trim())
    .transform((value, ctx) => {
      if (!isCalendarDate(value)) {
        ctx.addIssue({ code: "custom", message: messages.dateOfBirth });
        return z.NEVER;
      }
      if (value > today) {
        ctx.addIssue({ code: "custom", message: messages.dateOfBirthFuture });
        return z.NEVER;
      }
      const age = ageOn(value, today);
      if (age < MIN_AGE || age > MAX_AGE) {
        ctx.addIssue({ code: "custom", message: messages.dateOfBirthAge });
        return z.NEVER;
      }
      return value;
    });
}

const always = () => true;

/** A raw or cleaned value as a space-collapsed string; anything else counts as empty. */
function flat(value: unknown): string {
  return typeof value === "string" ? collapseSpaces(value) : "";
}

function mobileOk(value: unknown): boolean {
  const typed = flat(value);
  return typed === "" || normalisePakistaniMobile(typed) !== null;
}

function isEmptyParents(value: { fatherMobile?: unknown; motherMobile?: unknown }): boolean {
  return flat(value.fatherMobile) === "" && flat(value.motherMobile) === "";
}

function referenceCount(value: { referenceName?: unknown; referenceClass?: unknown; referenceRelation?: unknown }): number {
  return [value.referenceName, value.referenceClass, value.referenceRelation].filter((entry) => flat(entry) !== "").length;
}

/** A filled reference value must be 2 to 100 characters; an empty one is left to the all-or-none rule. */
function referenceLengthOk(value: unknown): boolean {
  const typed = flat(value);
  return typed === "" || (typed.length >= 2 && typed.length <= 100);
}

export function buildRegistrationSchema({ classes, today }: { classes: readonly string[]; today: string }) {
  const classByCollapsed = new Map(classes.map((name) => [collapseSpaces(name), name]));

  return z
    .object({
      studentName: line(2, 100, messages.studentName),
      fatherName: line(2, 100, messages.fatherName),
      motherName: line(2, 100, messages.motherName),
      email: z
        .preprocess((value) => (value === undefined || value === null ? "" : value), z.string({ error: messages.email }))
        .transform((value) => value.trim().toLowerCase())
        .pipe(z.email(messages.email).max(254, messages.email)),
      dateOfBirth: dateOfBirth(today),
      fatherMobile: cleaned,
      motherMobile: cleaned,
      address: area(10, 300, messages.address),
      emergencyPhone: text
        .transform((value) => normalisePakistaniMobile(value.trim()))
        .refine((value): value is string => value !== null, messages.phone),
      className: text
        .transform((value) => classByCollapsed.get(collapseSpaces(value)) ?? null)
        .refine((value): value is string => value !== null, messages.className),
      motherTongue: z.enum(MOTHER_TONGUES, { error: messages.motherTongue }),
      motherTongueOther: cleaned,
      vaccinated: z
        .enum(["yes", "no"], { error: messages.vaccinated })
        .transform((value) => value === "yes"),
      medicalHistory: area(0, 1000, messages.medicalHistory),
      referenceName: cleaned,
      referenceClass: cleaned,
      referenceRelation: cleaned,
      remarks: area(0, 1000, messages.remarks),
      // The browser sends `true`; a hand-made request may send "true".
      consent: z.union([z.literal(true), z.literal("true")], { error: messages.consent }).transform(() => true as const),
    })
    // Cross-field rules. `when` makes them run even when another field failed with a
    // type error, so the form can show every message at once; the value is then the raw
    // input for that pass, so each rule reads it defensively.
    .refine((value) => !isEmptyParents(value), { path: ["fatherMobile"], message: messages.parentMobile, when: always })
    .refine((value) => !isEmptyParents(value), { path: ["motherMobile"], message: messages.parentMobile, when: always })
    .refine((value) => mobileOk(value.fatherMobile), { path: ["fatherMobile"], message: messages.phone, when: always })
    .refine((value) => mobileOk(value.motherMobile), { path: ["motherMobile"], message: messages.phone, when: always })
    .refine(
      (value) => {
        if (value.motherTongue !== "other") return true;
        const other = flat(value.motherTongueOther);
        return other.length >= 2 && other.length <= 50;
      },
      { path: ["motherTongueOther"], message: messages.motherTongueOther, when: always },
    )
    .refine((value) => referenceCount(value) === 0 || referenceCount(value) === 3 || flat(value.referenceName) !== "", {
      path: ["referenceName"],
      message: messages.reference,
      when: always,
    })
    .refine((value) => referenceCount(value) === 0 || referenceCount(value) === 3 || flat(value.referenceClass) !== "", {
      path: ["referenceClass"],
      message: messages.reference,
      when: always,
    })
    .refine((value) => referenceCount(value) === 0 || referenceCount(value) === 3 || flat(value.referenceRelation) !== "", {
      path: ["referenceRelation"],
      message: messages.reference,
      when: always,
    })
    .refine((value) => referenceLengthOk(value.referenceName), { path: ["referenceName"], message: messages.referenceLength, when: always })
    .refine((value) => referenceLengthOk(value.referenceClass), { path: ["referenceClass"], message: messages.referenceLength, when: always })
    .refine((value) => referenceLengthOk(value.referenceRelation), { path: ["referenceRelation"], message: messages.referenceLength, when: always })
    .transform((value): RegistrationOutput => {
      const referenceFilled = value.referenceName !== "" && value.referenceClass !== "" && value.referenceRelation !== "";
      return {
        studentName: value.studentName,
        fatherName: value.fatherName,
        motherName: value.motherName,
        email: value.email,
        dateOfBirth: value.dateOfBirth,
        fatherMobile: value.fatherMobile === "" ? null : normalisePakistaniMobile(value.fatherMobile),
        motherMobile: value.motherMobile === "" ? null : normalisePakistaniMobile(value.motherMobile),
        address: value.address,
        emergencyPhone: value.emergencyPhone,
        className: value.className,
        motherTongue: value.motherTongue,
        motherTongueOther: value.motherTongue === "other" ? value.motherTongueOther : null,
        vaccinated: value.vaccinated,
        medicalHistory: value.medicalHistory === "" ? null : value.medicalHistory,
        referenceStudent: referenceFilled
          ? { name: value.referenceName, className: value.referenceClass, relation: value.referenceRelation }
          : null,
        remarks: value.remarks === "" ? null : value.remarks,
        consent: value.consent,
      };
    });
}

export type RegistrationSchema = ReturnType<typeof buildRegistrationSchema>;
