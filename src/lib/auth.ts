import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { connectDb, getMongoClient } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { loginLockoutAfter, loginLockoutBefore } from "@/lib/login-lockout";

// Inferred from buildAuth()'s own betterAuth({...}) call below, rather
// than declared separately — the generic BetterAuthOptions is too broad
// to describe this specific config and would break assignability.
type Auth = Awaited<ReturnType<typeof buildAuth>>;

/**
 * The single Better Auth instance, configured for exactly one
 * email/password admin with public sign-up disabled (FR-001). See
 * specs/002-foundation/research.md §4 for the sourced rationale behind
 * every option below.
 *
 * Built lazily behind getAuth() rather than at module top level: it
 * needs connectDb() to resolve first (mongodbAdapter needs a real Db +
 * MongoClient at construction time), and a top-level `await` here is
 * invalid wherever this module gets bundled to CommonJS output — e.g.
 * `tsx` transforming scripts/seed-admin.ts's dynamic import of this
 * module. Every consumer calls `await getAuth()` instead of importing
 * a ready-made `auth` object.
 */
let authPromise: Promise<Auth> | null = null;

export async function getAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = buildAuth().catch((err) => {
      // Don't cache a rejected promise forever — let the next call retry.
      authPromise = null;
      throw err;
    });
  }
  return authPromise;
}

async function buildAuth() {
  const db = await connectDb();
  const env = getEnv();

  return betterAuth({
    database: mongodbAdapter(db.connection.db!, { client: getMongoClient() }),
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    emailAndPassword: {
      enabled: true,
      // No public sign-up, ever — the seed script is the only way to
      // create or change the single admin account (FR-001, FR-006).
      disableSignUp: true,
      // Enforced here as well as in the seed script's own check, so the
      // rule holds even if an admin account is ever created any other way.
      minPasswordLength: 12,
    },
    session: {
      // Rolling 7-day idle expiry: a visit refreshes the session at most
      // once per day (updateAge), so the session dies 7 days after the
      // last day it was used (spec Clarification 1, FR-019).
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      // Defence-in-depth only — this is a per-IP *request* counter, not a
      // failure counter, and doesn't distinguish per-account abuse. The
      // dual-key lockout in login-lockout.ts is the tested mechanism for
      // FR-027. Disabled outside production so parallel test runs aren't
      // throttled by this layer (sp.analyze finding I1).
      enabled: process.env.NODE_ENV === "production",
      storage: "database",
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
      },
    },
    hooks: {
      // Dual-key login lockout — runs for both the login Server Action
      // (via auth.api.signInEmail) and the mounted HTTP route, since both
      // paths go through the same hook pipeline (FR-027; research.md §6).
      before: loginLockoutBefore,
      after: loginLockoutAfter,
    },
    plugins: [nextCookies()],
    advanced: {
      ipAddress: {
        // Revisit once hosting is chosen (docs/architecture.md "Hosting:
        // TODO"; specs/002-foundation/plan.md risk 1) — these are the two
        // most common forwarded-IP headers, but the real header depends on
        // the host's proxy.
        ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
      },
    },
  });
}
