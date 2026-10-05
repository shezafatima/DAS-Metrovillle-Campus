import { isValidObjectId } from "mongoose";
import { connectDb } from "@/lib/db";
import { CareerApplication, type CareerApplicationDoc } from "@/models/career-application";
import { type Paged, ADMIN_PAGE_SIZE, escapeRegExp } from "@/lib/admin-list";
import { formatPhoneLocal, phoneSearchDigits } from "@/lib/phone";

/**
 * What the admin sees of an application. Deliberately has no field for the
 * CV's storage key, size or timestamps: the file is reached only through the
 * checked download route.
 */
export interface CareerApplicationRow {
  id: string;
  name: string;
  email: string;
  phone: string; // E.164, for tel: href
  phoneDisplay: string; // "03XXXXXXXXX"
  qualification: string;
  appliedAt: string; // ISO
}

function toRow(doc: Pick<CareerApplicationDoc, "_id" | "name" | "email" | "phone" | "qualification" | "createdAt">): CareerApplicationRow {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    phoneDisplay: formatPhoneLocal(doc.phone),
    qualification: doc.qualification,
    appliedAt: doc.createdAt.toISOString(),
  };
}

export interface ListApplicationsOptions {
  q?: string;
  page?: number;
}

/**
 * The one filter every admin read goes through (list, detail, count, export,
 * notifications): only STORED applications (`cv.storedAt` set, so a pending
 * upload is never visible); the soft-delete plugin already hides deleted
 * ones. Search matches name or email as a case-insensitive literal substring
 * (works for Urdu), or the phone by digits so "0300 123", "+92 300 123" and
 * "300123" all find the same stored value.
 */
export function buildApplicationsFilter(options: { q?: string } = {}): Record<string, unknown> {
  const filter: Record<string, unknown> = { "cv.storedAt": { $ne: null } };

  const q = options.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegExp(q), "i");
    const or: Record<string, unknown>[] = [{ name: rx }, { email: rx }];
    const phoneDigits = phoneSearchDigits(q);
    if (phoneDigits) or.push({ phone: new RegExp(escapeRegExp(phoneDigits)) });
    filter.$or = or;
  }
  return filter;
}

/** Newest first, `ADMIN_PAGE_SIZE` per page. */
export async function listApplications(options: ListApplicationsOptions = {}): Promise<Paged<CareerApplicationRow>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter = buildApplicationsFilter(options);

  const total = await CareerApplication.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const docs = await CareerApplication.find(filter)
    .select({ name: 1, email: 1, phone: 1, qualification: 1, createdAt: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .lean();

  return {
    items: docs.map((doc) => toRow(doc as unknown as CareerApplicationDoc)),
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total,
    totalPages,
  };
}

/** One application for the detail page; `null` for a malformed, unknown, pending or deleted id. */
export async function getApplication(id: string): Promise<CareerApplicationRow | null> {
  if (!/^[a-f0-9]{24}$/i.test(id) || !isValidObjectId(id)) return null;
  await connectDb();
  const doc = await CareerApplication.findOne({ ...buildApplicationsFilter(), _id: id })
    .select({ name: 1, email: 1, phone: 1, qualification: 1, createdAt: 1 })
    .lean();
  return doc ? toRow(doc as unknown as CareerApplicationDoc) : null;
}

/** Count of stored, live applications for the Overview card. */
export async function countApplications(): Promise<number> {
  await connectDb();
  return CareerApplication.countDocuments(buildApplicationsFilter());
}

/**
 * Every application matching the current search, unpaginated: feeds the CSV
 * export, which must contain every filtered row, not just the current page.
 */
export async function findApplicationsForExport(options: { q?: string } = {}): Promise<CareerApplicationRow[]> {
  await connectDb();
  const docs = await CareerApplication.find(buildApplicationsFilter(options))
    .select({ name: 1, email: 1, phone: 1, qualification: 1, createdAt: 1 })
    .sort({ createdAt: -1, _id: -1 })
    .lean();
  return docs.map((doc) => toRow(doc as unknown as CareerApplicationDoc));
}
