import { expect, type BrowserContext, type Page } from "@playwright/test";
import mongoose from "mongoose";
import { seedSettingsGroup } from "./settings";

/**
 * Seeding/reading helpers for the student registration (013) Playwright
 * specs. Like the careers helpers they write straight to the collections so
 * specs can set up exact fixtures. Seeded values are distinctive on purpose
 * ("Zartasha Testchild", "PeanutAllergyMarker") so the "no personal data in
 * a response or a notification" assertions can search for them.
 */

async function withDb<T>(fn: (db: mongoose.mongo.Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/registrations] MONGODB_URI is not set");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  try {
    return await fn(mongoose.connection.db!);
  } finally {
    if (!wasConnected) await mongoose.disconnect().catch(() => {});
  }
}

export const E2E_BASE_URL = "http://localhost:3100";

/** A window that is open on 2027-02-01 (the date the specs fake with the e2e-now cookie). */
export const OPEN_NOW = "2027-02-01T06:00:00Z";
export const OPEN_WINDOW = { opensOn: "2027-01-01", closesOn: "2027-03-31" };
export const CLASSES = ["Playgroup", "Nursery", "Class 1"];

/** Seeds the Settings admission group with a window and a class list. */
export async function openAdmission(
  options: { classes?: string[]; opensOn?: string; closesOn?: string; announcement?: string; closedMessage?: string } = {},
): Promise<void> {
  const classes = (options.classes ?? CLASSES).map((name, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    name,
    deletedAt: null,
  }));
  await seedSettingsGroup("admission", {
    opensOn: options.opensOn ?? OPEN_WINDOW.opensOn,
    closesOn: options.closesOn ?? OPEN_WINDOW.closesOn,
    announcement: options.announcement ?? "",
    closedMessage: options.closedMessage ?? "",
    classes,
  });
}

/** Resets the admission group (closed, no classes). */
export async function closeAdmission(): Promise<void> {
  await seedSettingsGroup("admission", { opensOn: "", closesOn: "", announcement: "", closedMessage: "", classes: [] });
}

/** Makes the server treat `iso` as "now" for this browser (test server only). */
export async function setNow(context: BrowserContext, iso: string): Promise<void> {
  await context.addCookies([{ name: "e2e-now", value: iso, url: E2E_BASE_URL }]);
}

export const VALID_VALUES: Record<string, string> = {
  studentName: "Zartasha Testchild",
  dateOfBirth: "2020-05-01",
  className: "Class 1",
  fatherName: "Imran Testfather",
  motherName: "Sana Testmother",
  fatherMobile: "03001234567",
  motherMobile: "",
  email: "parent@example.com",
  address: "House 12, Street 4, Metroville",
  emergencyName: "Uncle Testuncle",
  emergencyPhone: "03011234567",
  motherTongue: "urdu",
  motherTongueOther: "",
  medicalHistory: "PeanutAllergyMarker",
  referenceName: "",
  referenceClass: "",
  referenceRelation: "",
  remarks: "",
};

const SELECTS = new Set(["className", "motherTongue"]);

/** Fills the whole form with valid values (plus `overrides`), ticking Yes and the consent box. */
export async function fillValidRegistration(page: Page, overrides: Record<string, string> = {}): Promise<void> {
  const values = { ...VALID_VALUES, ...overrides };
  for (const [key, value] of Object.entries(values)) {
    const locator = page.locator(`#registration-${key}`);
    if (SELECTS.has(key)) {
      if (value) await locator.selectOption(value);
    } else if (value !== "") {
      await locator.fill(value);
    }
  }
  await page.locator("#registration-vaccinated").check();
  await page.locator("#registration-consent").check();
}

/** Waits for the open form. The first compile of the page can take minutes on a cold dev server. */
export async function openRegistrationPage(page: Page): Promise<void> {
  await page.goto("/admission/register", { timeout: 180_000 });
  await expect(page.locator("#registration-studentName")).toBeVisible({ timeout: 90_000 });
  // React has taken the form over: typing before this would be wiped by hydration.
  await expect(page.locator('form[data-ready="true"]')).toBeVisible({ timeout: 90_000 });
}

export interface RegistrationSeed {
  studentName: string;
  fatherName: string;
  motherName: string;
  className: string;
  email: string;
  dateOfBirth: string;
  fatherMobile: string | null;
  motherMobile: string | null;
  medicalHistory: string | null;
  status: string;
  createdAt: Date;
  deletedAt: Date | null;
  reference: string;
}

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function reference(): string {
  return Array.from({ length: 8 }, () => REFERENCE_ALPHABET[Math.floor(Math.random() * REFERENCE_ALPHABET.length)]).join("");
}

/** Inserts registrations directly; the first is the newest. Returns their ids and references in seed order. */
export async function seedRegistrations(
  seeds: Array<Partial<RegistrationSeed>>,
): Promise<Array<{ id: string; reference: string }>> {
  return withDb(async (db) => {
    const now = Date.now();
    const docs = seeds.map((seed, i) => {
      const createdAt = seed.createdAt ?? new Date(now - i * 60_000);
      const studentName = seed.studentName ?? `Student ${i + 1}`;
      const dateOfBirth = seed.dateOfBirth ?? "2020-05-01";
      const fatherMobile = seed.fatherMobile === undefined ? `+92300${String(1000000 + i)}` : seed.fatherMobile;
      return {
        reference: seed.reference ?? reference(),
        studentName,
        fatherName: seed.fatherName ?? `Father ${i + 1}`,
        motherName: seed.motherName ?? `Mother ${i + 1}`,
        email: seed.email ?? `parent${i}@example.com`,
        dateOfBirth,
        fatherMobile,
        motherMobile: seed.motherMobile ?? null,
        address: "House 12, Street 4, Metroville",
        emergencyContact: { name: "Uncle Testuncle", phone: "+923011234567" },
        className: seed.className ?? "Class 1",
        motherTongue: "urdu",
        motherTongueOther: null,
        vaccinated: true,
        medicalHistory: seed.medicalHistory === undefined ? null : seed.medicalHistory,
        referenceStudent: null,
        remarks: null,
        consentAt: createdAt,
        status: seed.status ?? "new",
        history: [],
        duplicateKey: fatherMobile ? duplicateKeyFor(studentName, dateOfBirth, fatherMobile) : null,
        deletedAt: seed.deletedAt ?? null,
        deletedBy: null,
        createdAt,
        updatedAt: createdAt,
      };
    });
    const result = await db.collection("studentRegistrations").insertMany(docs);
    return docs.map((doc, i) => ({ id: result.insertedIds[i]!.toString(), reference: doc.reference }));
  });
}

function duplicateKeyFor(studentName: string, dateOfBirth: string, fatherMobile: string): string {
  // Same recipe as src/lib/registration/duplicate-key.ts.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  const name = studentName.replace(/\s+/g, " ").trim().toLowerCase().normalize("NFC");
  return createHash("sha256").update(`${name}|${dateOfBirth}|${fatherMobile}`).digest("hex");
}

/** Raw `studentRegistrations` documents (soft-deleted ones only when asked for), newest first. */
export async function findRegistrations(options: { withDeleted?: boolean; reference?: string } = {}): Promise<Array<Record<string, any>>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return withDb(async (db) => {
    const filter: Record<string, unknown> = {};
    if (!options.withDeleted) filter.deletedAt = null;
    if (options.reference) filter.reference = options.reference;
    return db.collection("studentRegistrations").find(filter).sort({ createdAt: -1 }).toArray();
  });
}

/** Moves a registration's dates back (simulates time passing). */
export async function setRegistrationDates(id: string, dates: { createdAt?: Date; deletedAt?: Date | null }): Promise<void> {
  await withDb(async (db) => {
    const set: Record<string, unknown> = {};
    if (dates.createdAt) set.createdAt = dates.createdAt;
    if (dates.deletedAt !== undefined) set.deletedAt = dates.deletedAt;
    await db.collection("studentRegistrations").updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: set });
  });
}

export async function clearRegistrations(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("studentRegistrations").deleteMany({});
    await db.collection("registrationExports").deleteMany({});
  });
}

export async function findExports(): Promise<Array<Record<string, any>>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return withDb((db) => db.collection("registrationExports").find({}).toArray());
}

/** Lets the hourly retention sweep run again straight away. */
export async function clearSweepThrottle(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("throttles").deleteMany({ key: "sweep:registrations" });
  });
}

/** Forgets the form rate-limit counters for one address. */
export async function clearRegistrationRateLimit(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("throttles").deleteMany({ key: /^form:registration:/ });
  });
}

/** `X-Forwarded-For` header isolating a spec's rate-limit budget. */
export function forwardedFor(n: number): Record<string, string> {
  return { "X-Forwarded-For": `198.51.100.${n}` };
}

/** Replaces the notification settings changed by specs: puts the admin notification state back. */
export async function clearNotificationState(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("adminNotificationStates").deleteMany({});
  });
}

export { loginAsAdmin } from "./news";
