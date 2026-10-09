import { createHash, randomBytes } from "node:crypto";
import { connectDb } from "@/lib/db";
import { CareerApplicationLock } from "@/models/career-application-lock";

/**
 * Per-identity locks (ADR-0008, Constitution VI v3.0.0). The reapply window
 * cannot be a unique index, so "check the window, then insert" runs only
 * while holding a lock for the submission's email and one for its phone.
 * Exclusivity comes from the database: a lock is a document whose `_id` is
 * unique, so only one request can hold a given key. Two submissions that
 * share an email OR a phone need the same key, so the second can only
 * enter after the first has inserted its application and released, and
 * then its window check sees that application.
 *
 * The lock `_id` is a hash, so the collection holds no personal data.
 */

export class LockBusyError extends Error {
  constructor() {
    super("Another application from the same email or phone is being saved");
    this.name = "LockBusyError";
  }
}

export interface LockOptions {
  /** How long a held lock is waited for before giving up. */
  waitMs?: number;
  /** How long a lock lasts if its holder disappears. */
  leaseMs?: number;
  /** How long the protected work may run before the request is abandoned. */
  criticalMs?: number;
  retryMs?: number;
}

const DEFAULTS = { waitMs: 2_000, leaseMs: 30_000, criticalMs: 10_000, retryMs: 200 } as const;

/** `email:<sha256>` / `phone:<sha256>`: the lock key for a normalised value. */
export function lockKey(kind: "email" | "phone", value: string): string {
  return `${kind}:${createHash("sha256").update(value).digest("hex")}`;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Takes one lock: succeeds when no lock exists or the existing one has
 * expired. A live lock makes the conditional upsert try to insert the same
 * unique `_id`, which fails with E11000, meaning "held", so retry until the
 * deadline.
 */
async function acquire(key: string, owner: string, options: Required<LockOptions>): Promise<void> {
  const deadline = Date.now() + options.waitMs;
  for (;;) {
    const now = new Date();
    try {
      await CareerApplicationLock.findOneAndUpdate(
        { _id: key, expiresAt: { $lte: now } },
        { $set: { owner, expiresAt: new Date(now.getTime() + options.leaseMs) } },
        { upsert: true },
      );
      return;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      if (Date.now() + options.retryMs > deadline) throw new LockBusyError();
      await sleep(options.retryMs);
    }
  }
}

/** Only the owner can release, so a slow request can never free a lock that someone else now holds. */
async function release(keys: string[], owner: string): Promise<void> {
  await Promise.all(keys.map((key) => CareerApplicationLock.deleteOne({ _id: key, owner }).catch(() => {})));
}

/**
 * Runs `work` while holding the email and phone locks, acquired in sorted
 * order so two requests can never wait on each other. If `work` runs longer
 * than `criticalMs` the request is abandoned (LockBusyError) but the locks
 * are NOT released early: they lapse at the end of their lease, so a late
 * insert from the abandoned work is still protected.
 */
export async function withIdentityLocks<T>(
  identity: { email: string; phone: string },
  work: () => Promise<T>,
  overrides: LockOptions = {},
): Promise<T> {
  const options = { ...DEFAULTS, ...overrides } as Required<LockOptions>;
  await connectDb();

  const owner = randomBytes(16).toString("hex");
  const keys = [lockKey("email", identity.email), lockKey("phone", identity.phone)].sort();
  const held: string[] = [];

  try {
    for (const key of keys) {
      await acquire(key, owner, options);
      held.push(key);
    }
  } catch (error) {
    await release(held, owner);
    throw error;
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  let abandoned = false;
  try {
    const running = work();
    // If we give up on `running`, its late failure must not surface as an unhandled rejection.
    running.catch(() => {});
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        abandoned = true;
        reject(new LockBusyError());
      }, options.criticalMs);
    });
    return await Promise.race([running, deadline]);
  } finally {
    if (timer) clearTimeout(timer);
    if (!abandoned) await release(held, owner);
  }
}
