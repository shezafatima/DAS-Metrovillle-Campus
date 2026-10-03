import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";

/**
 * Seeding/reading helpers for the careers (012) Playwright specs. Writes
 * directly to the `careerApplications` collection and the local document
 * store directory (the dev server runs with DOCUMENT_STORE_DRIVER=local and
 * DOCUMENT_STORE_LOCAL_DIR=.data/e2e-documents, see playwright.config.ts),
 * bypassing the app's mutation layer so specs can set up exact fixtures.
 */

export const E2E_STORE_DIR = path.resolve(process.cwd(), ".data/e2e-documents");
export const FIXTURE_PDF = path.resolve(process.cwd(), "e2e/fixtures/cv-valid.pdf");
export const FIXTURE_RENAMED = path.resolve(process.cwd(), "e2e/fixtures/cv-renamed.pdf");

export interface ApplicationSeed {
  name: string;
  email: string;
  phone: string; // E.164
  qualification: string;
  createdAt: Date;
  deletedAt: Date | null;
  /** false seeds a PENDING record (CV never confirmed). */
  stored: boolean;
}

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/careers] MONGODB_URI is not set — cannot seed applications");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) {
    await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  }
  try {
    return await fn();
  } finally {
    if (!wasConnected) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

/** A minimal valid PDF (`%PDF-` header, `%%EOF` trailer) of exactly `size` bytes. */
function pdfBytes(size: number): Buffer {
  const head = Buffer.from("%PDF-1.4\n");
  const tail = Buffer.from("\n%%EOF");
  const bytes = Buffer.alloc(size, 0x20);
  head.copy(bytes, 0);
  tail.copy(bytes, size - tail.length);
  return bytes;
}

/** One byte over the 4 MiB CV limit, still starting `%PDF-`. */
export function oversizedPdf(): Buffer {
  return pdfBytes(4 * 1024 * 1024 + 1);
}

function randomKey(): string {
  const id = Buffer.from(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))).toString("base64url");
  return `cv/${id}.pdf`;
}

/**
 * Inserts applications (default: stored, not deleted, created now minus the
 * seed's index in minutes so insertion order is newest first) and writes a
 * CV file for each stored one. Returns `{ id, key }` in seed order.
 */
export async function seedCareerApplications(
  seeds: Array<Partial<ApplicationSeed>>,
): Promise<Array<{ id: string; key: string }>> {
  return withConnection(async () => {
    const now = new Date();
    const docs = seeds.map((seed, i) => {
      const key = randomKey();
      const stored = seed.stored ?? true;
      const createdAt = seed.createdAt ?? new Date(now.getTime() - i * 60_000);
      return {
        key,
        doc: {
          name: seed.name ?? "Ayesha Khan",
          email: (seed.email ?? `applicant${i}@example.com`).trim().toLowerCase(),
          phone: seed.phone ?? `+92300${String(1000000 + i)}`,
          qualification: seed.qualification ?? "M.Ed",
          consentAt: createdAt,
          cv: { key, size: 1024, storedAt: stored ? createdAt : null, removedAt: null },
          deletedAt: seed.deletedAt ?? null,
          createdAt,
          updatedAt: createdAt,
        },
      };
    });
    for (const { key, doc } of docs) {
      if (doc.cv.storedAt) {
        const file = path.join(E2E_STORE_DIR, key);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, pdfBytes(1024));
      }
    }
    const result = await mongoose.connection.db?.collection("careerApplications").insertMany(docs.map((d) => d.doc));
    if (!result) throw new Error("[e2e/helpers/careers] insertMany returned no result");
    return docs.map((d, i) => ({ id: result.insertedIds[i]!.toString(), key: d.key }));
  });
}

/** Reads raw `careerApplications` documents, optionally by email and/or including soft-deleted ones. */
export async function findCareerApplications(
  options: { email?: string; withDeleted?: boolean } = {},
): Promise<Array<Record<string, any>>> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return withConnection(async () => {
    const filter: Record<string, unknown> = {};
    if (options.email) filter.email = options.email.trim().toLowerCase();
    if (!options.withDeleted) filter.deletedAt = null;
    const docs = await mongoose.connection.db?.collection("careerApplications").find(filter).sort({ createdAt: -1 }).toArray();
    return docs ?? [];
  });
}

/** Moves an application's `createdAt` back in time (simulates the 30-day window passing). */
export async function backdateApplication(email: string, days: number): Promise<void> {
  await withConnection(async () => {
    const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    await mongoose.connection.db
      ?.collection("careerApplications")
      .updateMany({ email: email.trim().toLowerCase() }, { $set: { createdAt: date, updatedAt: date } });
  });
}

/** Removes every application, every identity lock and every stored CV file. */
export async function clearCareerApplications(): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("careerApplications").deleteMany({});
    await mongoose.connection.db?.collection("careerApplicationLocks").deleteMany({});
  });
  await rm(E2E_STORE_DIR, { recursive: true, force: true });
}

/** Is a CV object present in the E2E document store? */
export async function storeFileExists(key: string): Promise<boolean> {
  try {
    await stat(path.join(E2E_STORE_DIR, key));
    return true;
  } catch {
    return false;
  }
}

/** Makes the local document store throw for every call (the "store unavailable" case) or restores it. */
export async function setStoreUnavailable(unavailable: boolean): Promise<void> {
  const sentinel = path.join(E2E_STORE_DIR, ".unavailable");
  if (unavailable) {
    await mkdir(E2E_STORE_DIR, { recursive: true });
    await writeFile(sentinel, "");
  } else {
    await rm(sentinel, { force: true });
  }
}

/** `X-Forwarded-For` header isolating a spec's rate-limit budget (TEST-NET-2; messages use TEST-NET-3). */
export function forwardedFor(n: number): Record<string, string> {
  return { "X-Forwarded-For": `198.51.100.${n}` };
}

export { loginAsAdmin } from "./news";
