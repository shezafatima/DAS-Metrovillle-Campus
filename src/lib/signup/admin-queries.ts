import { connectDb } from "@/lib/db";
import { Signup, type SignupDoc } from "@/models/signup";
import { type Paged, ADMIN_PAGE_SIZE, escapeRegExp } from "@/lib/admin-list";
import { isSignupSource, type SignupSource } from "@/lib/signup/sources";
import { formatPhoneLocal, phoneSearchDigits } from "@/lib/signup/phone";

export interface SignupRow {
  id: string;
  name: string;
  email: string;
  phone: string; // E.164, for tel: href
  phoneDisplay: string; // "03XXXXXXXXX"
  sources: SignupSource[];
  firstSignupAt: string; // ISO
  lastSignupAt: string; // ISO
}

function toSignupRow(doc: SignupDoc): SignupRow {
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    phone: doc.phone,
    phoneDisplay: formatPhoneLocal(doc.phone),
    sources: doc.sources as SignupSource[],
    firstSignupAt: doc.firstSignupAt.toISOString(),
    lastSignupAt: doc.lastSignupAt.toISOString(),
  };
}

export interface ListSignupsOptions {
  q?: string;
  source?: string;
  page?: number;
}

/** Shared by listSignups and findSignupsForExport so the two never drift apart. */
function buildFilter(options: { q?: string; source?: string }): Record<string, unknown> {
  const filter: Record<string, unknown> = {};

  const q = options.q?.trim();
  if (q) {
    const rx = new RegExp(escapeRegExp(q), "i");
    const or: Record<string, unknown>[] = [{ name: rx }, { email: rx }];
    const phoneDigits = phoneSearchDigits(q);
    if (phoneDigits) {
      or.push({ phone: new RegExp(escapeRegExp(phoneDigits)) });
    }
    filter.$or = or;
  }

  if (options.source && isSignupSource(options.source)) {
    filter.sources = options.source;
  }

  return filter;
}

/**
 * The admin list query (FR-017–FR-019). Search matches name, email or
 * phone in one box: name/email use a case-insensitive substring regex
 * (works for Urdu — literal comparison, no stemming); phone is matched
 * by digits so "0300 123", "+92 300 123" and "300123" all find the
 * same stored E.164 value (research.md §5).
 */
export async function listSignups(options: ListSignupsOptions = {}): Promise<Paged<SignupRow>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter = buildFilter(options);

  const total = await Signup.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const docs = await Signup.find(filter)
    .sort({ lastSignupAt: -1, updatedAt: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE);

  return {
    items: docs.map(toSignupRow),
    page,
    pageSize: ADMIN_PAGE_SIZE,
    total,
    totalPages,
  };
}

/** Count of live signups for the admin Overview stat card (FR-023a). */
export async function countSignups(): Promise<number> {
  await connectDb();
  return Signup.countDocuments({});
}

/**
 * Every record matching the current search/filter, unpaginated —
 * feeds the CSV export (US6), which must include every filtered row,
 * not just the current page.
 */
export async function findSignupsForExport(options: Omit<ListSignupsOptions, "page"> = {}): Promise<SignupRow[]> {
  await connectDb();
  const filter = buildFilter(options);
  const docs = await Signup.find(filter).sort({ lastSignupAt: -1, updatedAt: -1 }).lean();
  return docs.map((doc) => toSignupRow(doc as unknown as SignupDoc));
}
