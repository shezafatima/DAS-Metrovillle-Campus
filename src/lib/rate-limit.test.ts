// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/test/db";
import { Throttle } from "@/models/throttle";
import { checkRateLimit, recordFailure, isBlocked, clearKeys } from "@/lib/rate-limit";

describeWithDb("rate-limit", ["throttles"], () => {
  it("allows up to max requests then refuses the next with retryAfterSeconds > 0", async () => {
    const key = `test:checkRateLimit:${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      const { allowed } = await checkRateLimit({ key, max: 3, windowSeconds: 60 });
      expect(allowed).toBe(true);
    }
    const fourth = await checkRateLimit({ key, max: 3, windowSeconds: 60 });
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("resets the count after the window has elapsed", async () => {
    const key = `test:windowReset:${Date.now()}`;
    await checkRateLimit({ key, max: 1, windowSeconds: 60 });
    const refused = await checkRateLimit({ key, max: 1, windowSeconds: 60 });
    expect(refused.allowed).toBe(false);

    // Backdate the window so it looks like it has already elapsed.
    await Throttle.updateOne({ key }, { $set: { windowStart: new Date(Date.now() - 120_000) } });

    const afterReset = await checkRateLimit({ key, max: 1, windowSeconds: 60 });
    expect(afterReset.allowed).toBe(true);
  });

  it("sets blockedUntil exactly on the threshold-th failure and not before", async () => {
    const key = `test:threshold:${Date.now()}`;
    for (let i = 0; i < 4; i++) {
      const { blocked } = await recordFailure({ key, threshold: 5, windowSeconds: 900, blockSeconds: 900 });
      expect(blocked).toBe(false);
      expect(await isBlocked(key)).toBe(false);
    }
    const fifth = await recordFailure({ key, threshold: 5, windowSeconds: 900, blockSeconds: 900 });
    expect(fifth.blocked).toBe(true);
    expect(await isBlocked(key)).toBe(true);
  });

  it("isBlocked is false once blockedUntil has passed", async () => {
    const key = `test:blockExpiry:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await recordFailure({ key, threshold: 5, windowSeconds: 900, blockSeconds: 900 });
    }
    expect(await isBlocked(key)).toBe(true);
    await Throttle.updateOne({ key }, { $set: { blockedUntil: new Date(Date.now() - 1000) } });
    expect(await isBlocked(key)).toBe(false);
  });

  it("20 concurrent recordFailure calls yield count === 20 (atomicity)", async () => {
    const key = `test:concurrent:${Date.now()}`;
    await Promise.all(
      Array.from({ length: 20 }, () =>
        recordFailure({ key, threshold: 1000, windowSeconds: 900, blockSeconds: 900 }),
      ),
    );
    const doc = await Throttle.findOne({ key }).lean();
    expect(doc?.count).toBe(20);
  });

  it("expiresAt is at least blockedUntil once blocked", async () => {
    const key = `test:expiresAt:${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await recordFailure({ key, threshold: 5, windowSeconds: 900, blockSeconds: 900 });
    }
    const doc = await Throttle.findOne({ key }).lean();
    expect(doc?.blockedUntil).not.toBeNull();
    expect(doc!.expiresAt.getTime()).toBeGreaterThanOrEqual(doc!.blockedUntil!.getTime());
  });

  it("clearKeys removes the named throttle documents", async () => {
    const keyA = `test:clear:a:${Date.now()}`;
    const keyB = `test:clear:b:${Date.now()}`;
    await checkRateLimit({ key: keyA, max: 5, windowSeconds: 60 });
    await checkRateLimit({ key: keyB, max: 5, windowSeconds: 60 });
    await clearKeys([keyA, keyB]);
    expect(await Throttle.findOne({ key: keyA })).toBeNull();
    expect(await Throttle.findOne({ key: keyB })).toBeNull();
  });
});

describe("rate-limit (no DB required)", () => {
  it("module exports the expected policy shapes", async () => {
    const { LOGIN_IP_POLICY, LOGIN_EMAIL_POLICY, PUBLIC_FORM_POLICY } = await import("@/lib/rate-limit");
    expect(LOGIN_IP_POLICY).toEqual({ threshold: 5, windowSeconds: 900, blockSeconds: 900 });
    expect(LOGIN_EMAIL_POLICY).toEqual({ threshold: 20, windowSeconds: 900, blockSeconds: 900 });
    expect(PUBLIC_FORM_POLICY).toEqual({ max: 5, windowSeconds: 600 });
  });
});
