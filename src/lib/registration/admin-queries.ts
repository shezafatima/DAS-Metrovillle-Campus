import { isValidObjectId } from "mongoose";
import { connectDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { ADMIN_PAGE_SIZE, escapeRegExp, type Paged } from "@/lib/admin-list";
import { formatPhoneLocal } from "@/lib/phone";
import { retentionCutoff } from "@/lib/retention";
import { StudentRegistration, type StudentRegistrationDoc } from "@/models/student-registration";
import { REGISTRATION_DELETE_GRACE_DAYS, type MotherTongue, type RegistrationStatus } from "./rules";

/**
 * Every admin read of registrations (main admin only; the callers check
 * access). The DTOs below are the only shapes that leave this module: the
 * list has no health, address or reference details (FR-041).
 */

const DAY_MS = 86_400_000;

export interface RegistrationRow {
  id: string;
  reference: string;
  studentName: string;
  className: string;
  fatherName: string;
  /** Father's mobile, else mother's, in E.164 (for tel:); null when neither (cannot happen for valid data). */
  mobile: string | null;
  mobileDisplay: string;
  submittedAt: string; // ISO
  likelyDuplicate: boolean;
}

export interface RegistrationHistoryItem {
  at: string; // ISO
  action: "status" | "deleted" | "restored";
  from: RegistrationStatus | null;
  to: RegistrationStatus | null;
  byEmail: string;
}

export interface RegistrationDetail {
  id: string;
  reference: string;
  status: RegistrationStatus;
  studentName: string;
  dateOfBirth: string;
  className: string;
  fatherName: string;
  motherName: string;
  fatherMobile: string | null;
  motherMobile: string | null;
  email: string;
  address: string;
  emergencyName: string;
  emergencyPhone: string;
  motherTongue: MotherTongue;
  motherTongueOther: string | null;
  vaccinated: boolean;
  medicalHistory: string | null;
  referenceStudent: { name: string; className: string; relation: string } | null;
  remarks: string | null;
  submittedAt: string;
  consentAt: string;
  likelyDuplicate: boolean;
  history: RegistrationHistoryItem[];
}

export interface DeletedRegistrationRow {
  id: string;
  reference: string;
  studentName: string;
  className: string;
  deletedAt: string;
  daysLeft: number;
}

type ListDoc = Pick<
  StudentRegistrationDoc,
  "_id" | "reference" | "studentName" | "className" | "fatherName" | "fatherMobile" | "motherMobile" | "createdAt" | "duplicateKey"
>;

const LIST_FIELDS = {
  reference: 1,
  studentName: 1,
  className: 1,
  fatherName: 1,
  fatherMobile: 1,
  motherMobile: 1,
  createdAt: 1,
  duplicateKey: 1,
} as const;

function toRow(doc: ListDoc, duplicates: ReadonlySet<string>): RegistrationRow {
  const mobile = doc.fatherMobile ?? doc.motherMobile ?? null;
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    studentName: doc.studentName,
    className: doc.className,
    fatherName: doc.fatherName,
    mobile,
    mobileDisplay: mobile ? formatPhoneLocal(mobile) : "",
    submittedAt: doc.createdAt.toISOString(),
    likelyDuplicate: doc.duplicateKey != null && duplicates.has(doc.duplicateKey),
  };
}

/**
 * The one filter every admin read goes through (list, count, export): the
 * soft-delete plugin hides deleted records; `q` is an escaped,
 * case-insensitive substring over the student, father and mother names (works
 * for Urdu); `className` is an exact match on the stored class text.
 */
export function buildRegistrationsFilter(options: { q?: string; className?: string } = {}): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  const q = options.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegExp(q), "i");
    filter.$or = [{ studentName: rx }, { fatherName: rx }, { motherName: rx }];
  }
  const className = options.className?.trim();
  if (className) filter.className = className;
  return filter;
}

/** Keys that more than one live registration shares, among `keys`. */
async function duplicateKeysAmong(keys: readonly string[]): Promise<Set<string>> {
  if (keys.length === 0) return new Set();
  const groups = await StudentRegistration.aggregate<{ _id: string; n: number }>([
    { $match: { duplicateKey: { $in: [...keys] } } },
    { $group: { _id: "$duplicateKey", n: { $sum: 1 } } },
    { $match: { n: { $gte: 2 } } },
  ]);
  return new Set(groups.map((group) => group._id));
}

async function rowsFor(docs: ListDoc[]): Promise<RegistrationRow[]> {
  const keys = [...new Set(docs.map((doc) => doc.duplicateKey).filter((key): key is string => key != null))];
  const duplicates = await duplicateKeysAmong(keys);
  return docs.map((doc) => toRow(doc, duplicates));
}

export interface ListRegistrationsOptions {
  q?: string;
  className?: string;
  page?: number;
}

/** Newest first, `ADMIN_PAGE_SIZE` per page. */
export async function listRegistrations(options: ListRegistrationsOptions = {}): Promise<Paged<RegistrationRow>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter = buildRegistrationsFilter(options);

  const total = await StudentRegistration.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const docs = await StudentRegistration.find(filter)
    .select(LIST_FIELDS)
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE)
    .lean();

  return { items: await rowsFor(docs as unknown as ListDoc[]), page, pageSize: ADMIN_PAGE_SIZE, total, totalPages };
}

/** Every match, unpaginated: feeds the CSV export. */
export async function findRegistrationsForExport(options: { q?: string; className?: string } = {}): Promise<RegistrationDetail[]> {
  await connectDb();
  const docs = await StudentRegistration.find(buildRegistrationsFilter(options)).sort({ createdAt: -1, _id: -1 }).lean();
  const keys = [...new Set(docs.map((doc) => doc.duplicateKey).filter((key): key is string => key != null))];
  const duplicates = await duplicateKeysAmong(keys);
  return docs.map((doc) => toDetail(doc as unknown as StudentRegistrationDoc, doc.duplicateKey != null && duplicates.has(doc.duplicateKey)));
}

function toDetail(doc: StudentRegistrationDoc, likelyDuplicate: boolean): RegistrationDetail {
  return {
    id: doc._id.toString(),
    reference: doc.reference,
    status: doc.status as RegistrationStatus,
    studentName: doc.studentName,
    dateOfBirth: doc.dateOfBirth,
    className: doc.className,
    fatherName: doc.fatherName,
    motherName: doc.motherName,
    fatherMobile: doc.fatherMobile ?? null,
    motherMobile: doc.motherMobile ?? null,
    email: doc.email,
    address: doc.address,
    emergencyName: doc.emergencyContact?.name ?? "",
    emergencyPhone: doc.emergencyContact?.phone ?? "",
    motherTongue: doc.motherTongue as MotherTongue,
    motherTongueOther: doc.motherTongueOther ?? null,
    vaccinated: doc.vaccinated,
    medicalHistory: doc.medicalHistory ?? null,
    referenceStudent: doc.referenceStudent
      ? { name: doc.referenceStudent.name, className: doc.referenceStudent.className, relation: doc.referenceStudent.relation }
      : null,
    remarks: doc.remarks ?? null,
    submittedAt: doc.createdAt.toISOString(),
    consentAt: doc.consentAt.toISOString(),
    likelyDuplicate,
    history: (doc.history ?? []).map((entry) => ({
      at: entry.at.toISOString(),
      action: entry.action as RegistrationHistoryItem["action"],
      from: (entry.from as RegistrationStatus | undefined) ?? null,
      to: (entry.to as RegistrationStatus | undefined) ?? null,
      byEmail: entry.byEmail,
    })),
  };
}

/** One live registration for the detail page; null for a malformed, unknown or deleted id. */
export async function getRegistration(id: string): Promise<RegistrationDetail | null> {
  if (!/^[a-f0-9]{24}$/i.test(id) || !isValidObjectId(id)) return null;
  await connectDb();
  const doc = await StudentRegistration.findOne({ _id: id }).lean();
  if (!doc) return null;
  let likelyDuplicate = false;
  if (doc.duplicateKey) {
    likelyDuplicate = (await StudentRegistration.countDocuments({ duplicateKey: doc.duplicateKey })) >= 2;
  }
  return toDetail(doc as unknown as StudentRegistrationDoc, likelyDuplicate);
}

/** Distinct classes among live registrations, sorted, for the filter. */
export async function classOptions(): Promise<string[]> {
  await connectDb();
  const names = await StudentRegistration.distinct("className", { deletedAt: null });
  return names.filter((name): name is string => typeof name === "string" && name !== "").sort((a, b) => a.localeCompare(b));
}

/** Count of live registrations for the Overview card. */
export async function countRegistrations(): Promise<number> {
  await connectDb();
  return StudentRegistration.countDocuments({});
}

/** The retention end for a registration: createdAt plus the retention months. */
function retentionEnd(createdAt: Date, months: number): Date {
  const end = new Date(createdAt);
  end.setUTCMonth(end.getUTCMonth() + months);
  return end;
}

/**
 * The Deleted view: deleted less than REGISTRATION_DELETE_GRACE_DAYS ago and
 * still within retention (still restorable). `daysLeft` is the earlier of the
 * grace end and the retention end, rounded up to whole days (at least 1).
 */
export async function listDeleted(
  now: Date = new Date(),
  months: number = getEnv().REGISTRATION_RETENTION_MONTHS,
): Promise<DeletedRegistrationRow[]> {
  await connectDb();
  const graceCutoff = new Date(now.getTime() - REGISTRATION_DELETE_GRACE_DAYS * DAY_MS);
  const docs = await StudentRegistration.find({
    deletedAt: { $gt: graceCutoff },
    createdAt: { $gte: retentionCutoff(now, months) },
  })
    .setOptions({ withDeleted: true })
    .select({ reference: 1, studentName: 1, className: 1, deletedAt: 1, createdAt: 1 })
    .sort({ deletedAt: -1, _id: -1 })
    .lean();

  return docs.map((doc) => {
    const deletedAt = (doc as unknown as { deletedAt: Date }).deletedAt;
    const graceEnd = deletedAt.getTime() + REGISTRATION_DELETE_GRACE_DAYS * DAY_MS;
    const end = Math.min(graceEnd, retentionEnd(doc.createdAt, months).getTime());
    return {
      id: doc._id.toString(),
      reference: doc.reference,
      studentName: doc.studentName,
      className: doc.className,
      deletedAt: deletedAt.toISOString(),
      daysLeft: Math.max(1, Math.ceil((end - now.getTime()) / DAY_MS)),
    };
  });
}
