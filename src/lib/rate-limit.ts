import { connectDb } from "@/lib/db";
import { Throttle } from "@/models/throttle";

/**
 * Shared fixed-window throttle primitive backing both the login lockout
 * (US5) and public-form rate limiting (US6). See
 * specs/002-foundation/data-model.md "Throttle entry" for the state
 * machine this implements.
 *
 * Policy thresholds are per spec Clarification 2 and the Assumptions
 * section: 5 failed logins per source address / 15 min, 20 per account /
 * 15 min, either triggers a 15-minute block; 5 public-form submissions
 * per source / 10 min.
 *
 * The Account page's current-password check (010) has its own
 * per-account counter — 5 wrong / 15 min, 15-minute block — under a
 * separate key prefix, so it never shares state with login's.
 */
export const LOGIN_IP_POLICY = { threshold: 5, windowSeconds: 900, blockSeconds: 900 } as const;
export const LOGIN_EMAIL_POLICY = { threshold: 20, windowSeconds: 900, blockSeconds: 900 } as const;
export const PASSWORD_CHANGE_POLICY = { threshold: 5, windowSeconds: 900, blockSeconds: 900 } as const;
export const PUBLIC_FORM_POLICY = { max: 5, windowSeconds: 600 } as const;

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

/**
 * Atomically increments the counter for `key` within its current
 * fixed window, resetting to 1 when the previous window has elapsed
 * (or the key doesn't exist yet). Safe under concurrent callers: a
 * race between "reset" and "increment" resolves via the unique index
 * on `key` plus a retry, so N concurrent calls always yield count N,
 * never fewer.
 */
async function bumpWindowCounter(
  key: string,
  now: Date,
  windowSeconds: number,
): Promise<{ count: number; windowStart: Date }> {
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);
  const windowExpiresAt = new Date(now.getTime() + windowSeconds * 1000);

  const incremented = await Throttle.findOneAndUpdate(
    { key, windowStart: { $gt: cutoff } },
    { $inc: { count: 1 }, $max: { expiresAt: windowExpiresAt } },
    { returnDocument: "after" },
  ).lean();
  if (incremented) {
    return { count: incremented.count, windowStart: incremented.windowStart };
  }

  try {
    const reset = await Throttle.findOneAndUpdate(
      { key, $or: [{ windowStart: { $lte: cutoff } }, { windowStart: null }] },
      { $set: { count: 1, windowStart: now, blockedUntil: null, expiresAt: windowExpiresAt } },
      { upsert: true, returnDocument: "after" },
    ).lean();
    if (reset) return { count: reset.count, windowStart: reset.windowStart };
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    // Lost the race: another concurrent caller created/refreshed this key
    // between our two attempts. Fall through to a plain increment.
  }

  const retried = await Throttle.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $max: { expiresAt: windowExpiresAt } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return {
    count: retried?.count ?? 1,
    windowStart: retried?.windowStart ?? now,
  };
}

/**
 * Fixed-window rate limit check (used by public-form protection).
 * Every call counts as one request, whether or not it's allowed.
 */
export async function checkRateLimit({
  key,
  max,
  windowSeconds,
}: {
  key: string;
  max: number;
  windowSeconds: number;
}): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  await connectDb();
  const now = new Date();
  const { count, windowStart } = await bumpWindowCounter(key, now, windowSeconds);
  const allowed = count <= max;
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000));
  return { allowed, retryAfterSeconds };
}

/**
 * Records one failed login attempt for `key`. When the count reaches
 * `threshold` within the window, sets blockedUntil = now + blockSeconds
 * (only once per block cycle — a key already blocked keeps its original
 * blockedUntil rather than having it pushed out by further failures,
 * which in normal operation can't happen anyway because isBlocked()
 * short-circuits the login attempt before it can fail again).
 */
export async function recordFailure({
  key,
  threshold,
  windowSeconds,
  blockSeconds,
}: {
  key: string;
  threshold: number;
  windowSeconds: number;
  blockSeconds: number;
}): Promise<{ blocked: boolean }> {
  await connectDb();
  const now = new Date();
  const { count } = await bumpWindowCounter(key, now, windowSeconds);

  if (count >= threshold) {
    const blockedUntil = new Date(now.getTime() + blockSeconds * 1000);
    await Throttle.updateOne(
      { key, blockedUntil: null },
      { $set: { blockedUntil, expiresAt: blockedUntil } },
    );
    return { blocked: true };
  }
  return { blocked: false };
}

export async function isBlocked(key: string): Promise<boolean> {
  await connectDb();
  const doc = await Throttle.findOne({ key }).lean();
  if (!doc?.blockedUntil) return false;
  return doc.blockedUntil.getTime() > Date.now();
}

export async function clearKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  await connectDb();
  await Throttle.deleteMany({ key: { $in: keys } });
}
