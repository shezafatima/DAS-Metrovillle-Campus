// @vitest-environment node
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { CareerApplicationLock } from "@/models/career-application-lock";
import { LockBusyError, lockKey, withIdentityLocks } from "./identity-lock";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const IDENTITY = { email: "ayesha@example.com", phone: "+923001234567" };
const FAST = { waitMs: 600, retryMs: 50 };
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Starts a request that holds the locks for `holdMs`. `started` resolves
 * once the locks are really held (not after a guessed delay), so the tests
 * stay reliable however slow the database is.
 */
function hold(identity: { email: string; phone: string }, holdMs: number, order: string[], label: string) {
  let markStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    markStarted = resolve;
  });
  const finished = withIdentityLocks(identity, async () => {
    order.push(`${label} start`);
    markStarted();
    await sleep(holdMs);
    order.push(`${label} end`);
  });
  return { started, finished };
}

describeWithDb("withIdentityLocks", ["careerApplicationLocks"], () => {
  it("runs the work and releases both locks afterwards", async () => {
    const result = await withIdentityLocks(IDENTITY, async () => {
      expect(await CareerApplicationLock.countDocuments({})).toBe(2);
      return "done";
    });
    expect(result).toBe("done");
    expect(await CareerApplicationLock.countDocuments({})).toBe(0);
  });

  it("releases the locks when the work fails, and passes the failure on", async () => {
    await expect(
      withIdentityLocks(IDENTITY, async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    expect(await CareerApplicationLock.countDocuments({})).toBe(0);
  });

  it("stores only hashed keys, never the email or phone", async () => {
    await withIdentityLocks(IDENTITY, async () => {
      const ids = (await CareerApplicationLock.find({}).lean()).map((doc) => doc._id).sort();
      expect(ids).toEqual([lockKey("email", IDENTITY.email), lockKey("phone", IDENTITY.phone)].sort());
      for (const id of ids) {
        expect(id).toMatch(/^(email|phone):[0-9a-f]{64}$/);
        expect(id).not.toContain("ayesha");
        expect(id).not.toContain("3001234567");
      }
    });
  });

  it("makes a second request for the same email wait until the first has finished", async () => {
    const order: string[] = [];
    const first = hold(IDENTITY, 500, order, "first");
    await first.started;
    const second = withIdentityLocks({ email: IDENTITY.email, phone: "+923009999999" }, async () => {
      order.push("second start");
    });
    await Promise.all([first.finished, second]);
    expect(order).toEqual(["first start", "first end", "second start"]);
  });

  it("also serialises two requests that share only the phone", async () => {
    const order: string[] = [];
    const first = hold(IDENTITY, 400, order, "first");
    await first.started;
    const second = withIdentityLocks({ email: "other@example.com", phone: IDENTITY.phone }, async () => {
      order.push("second start");
    });
    await Promise.all([first.finished, second]);
    expect(order).toEqual(["first start", "first end", "second start"]);
  });

  it("lets requests that share nothing run at the same time", async () => {
    const order: string[] = [];
    const first = hold(IDENTITY, 5_000, order, "first");
    await first.started;
    // No waiting allowed: if the two shared a lock this would throw LockBusyError at once,
    // so passing proves they were independent however slow the database is.
    await withIdentityLocks(
      { email: "other@example.com", phone: "+923009999999" },
      async () => {
        order.push("second ran");
      },
      { waitMs: 1, retryMs: 1 },
    );
    expect(order).toEqual(["first start", "second ran"]);
    await first.finished;
    expect(order).toEqual(["first start", "second ran", "first end"]);
  });

  it("gives up with LockBusyError when a lock stays held, and leaves the holder's locks alone", async () => {
    const order: string[] = [];
    const holder = hold(IDENTITY, 1_500, order, "holder");
    await holder.started;
    await expect(withIdentityLocks(IDENTITY, async () => "never", FAST)).rejects.toBeInstanceOf(LockBusyError);
    // The holder still owns its two locks until it finishes.
    expect(await CareerApplicationLock.countDocuments({})).toBe(2);
    await holder.finished;
    expect(await CareerApplicationLock.countDocuments({})).toBe(0);
  });

  it("releases any lock it did take when it cannot get the other one", async () => {
    // Someone else holds only the phone lock.
    await CareerApplicationLock.collection.insertOne({
      _id: lockKey("phone", IDENTITY.phone) as never,
      owner: "someone-else",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(withIdentityLocks(IDENTITY, async () => "never", FAST)).rejects.toBeInstanceOf(LockBusyError);
    const left = await CareerApplicationLock.find({}).lean();
    expect(left.map((doc) => doc._id)).toEqual([lockKey("phone", IDENTITY.phone)]);
  });

  it("takes over an expired lock at once (a crashed holder never blocks anyone)", async () => {
    for (const key of [lockKey("email", IDENTITY.email), lockKey("phone", IDENTITY.phone)]) {
      await CareerApplicationLock.collection.insertOne({
        _id: key as never,
        owner: "crashed",
        expiresAt: new Date(Date.now() - 1_000),
      });
    }
    const started = Date.now();
    await expect(withIdentityLocks(IDENTITY, async () => "ok")).resolves.toBe("ok");
    expect(Date.now() - started).toBeLessThan(5_000);
  });

  it("does not let a non-owner release someone else's lock", async () => {
    const key = lockKey("email", IDENTITY.email);
    await CareerApplicationLock.collection.insertOne({
      _id: key as never,
      owner: "the-owner",
      expiresAt: new Date(Date.now() + 60_000),
    });
    await CareerApplicationLock.deleteOne({ _id: key, owner: "someone-else" });
    expect(await CareerApplicationLock.countDocuments({ _id: key })).toBe(1);
  });

  it("abandons work that runs too long, and keeps the locks until their lease ends", async () => {
    await expect(
      withIdentityLocks(
        IDENTITY,
        async () => {
          await sleep(1_500);
          return "late";
        },
        { criticalMs: 200 },
      ),
    ).rejects.toBeInstanceOf(LockBusyError);
    // Not released early: the abandoned work may still be writing.
    expect(await CareerApplicationLock.countDocuments({})).toBe(2);
  });
});
