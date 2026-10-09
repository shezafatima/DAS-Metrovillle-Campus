import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { nextCookies } from "better-auth/next-js";
import { connectDb, getMongoClient } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { loginLockoutAfter, loginLockoutBefore } from "@/lib/login-lockout";
import { assertMayLogIn } from "@/lib/login-gate";
import { passwordChangeLockout } from "@/lib/password-change-lockout";

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
    // HTTP-only closures (010 research §4): these mutations are reachable
    // only through the Account page's Server Actions, which add the rules
    // Better Auth doesn't (confirmation, differs-from-current). auth.api.*
    // calls from server code bypass the router, so they are unaffected.
    // /update-user and /change-email also enforce "no email or name editing".
    disabledPaths: [
      "/change-password",
      "/revoke-other-sessions",
      "/revoke-sessions",
      "/revoke-session",
      "/update-user",
      "/change-email",
      "/set-password",
    ],
    // Role and account state (011, data-model.md "User"). `input: false`
    // keeps every one of these out of reach of any Better Auth endpoint's
    // request body — they change only through src/lib/users/mutations.ts.
    // Defaults are the least privilege: an account that appears by any
    // other path is a content manager with no grants.
    user: {
      additionalFields: {
        role: { type: "string", required: false, defaultValue: "content_manager", input: false },
        permissions: { type: "string[]", required: false, defaultValue: [], input: false },
        disabledAt: { type: "date", required: false, input: false },
        deletedAt: { type: "date", required: false, input: false },
        lastLoginAt: { type: "date", required: false, input: false },
      },
    },
    session: {
      // Rolling 7-day idle expiry: a visit refreshes the session at most
      // once per day (updateAge), so the session dies 7 days after the
      // last day it was used (spec Clarification 1, FR-019).
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      // `cookieCache` MUST stay disabled (011 FR-007, research §2): with it
      // off, every getSession reads the session and user from the database,
      // so a role/grant change, disable or delete applies on the very next
      // request in every browser. Enabling it would make grants stale until
      // the cache expires. login-gate.test.ts fails if this is turned on.
    },
    databaseHooks: {
      session: {
        create: {
          // Runs after the password is verified, for every sign-in path.
          // Refuses disabled/deleted accounts with the generic 401 (011 research §5).
          before: async (session, context) => {
            const internalAdapter = context
              ? context.context.internalAdapter
              : (await (await getAuth()).$context).internalAdapter;
            const user = await internalAdapter.findUserById(session.userId);
            assertMayLogIn(user as Parameters<typeof assertMayLogIn>[0]);
          },
        },
      },
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
    // Account-page lockout (010) — its own per-account counter; see
    // password-change-lockout.ts. nextCookies() must stay last.
    plugins: [passwordChangeLockout(), nextCookies()],
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
