// @vitest-environment node
/**
 * The single sanctioned way to create or reset the admin account
 * (spec 002-foundation, User Story 1). See
 * specs/002-foundation/contracts/seed-admin-cli.md for the exact
 * outcomes, exit codes, and stdout lines this script must produce.
 *
 * Usage:
 *   npm run seed:admin              # create, or report "already exists"
 *   npm run seed:admin -- --reset   # create, or replace the password
 *                                   #   and end every existing session
 */
import { loadEnvConfig } from "@next/env";
import path from "node:path";

// Tests that simulate "this variable is entirely unset" spawn this
// script with the variable deleted from its explicit env — but
// .env.local sits at a fixed, discoverable path (this script's own
// parent directory), so loadEnvConfig() would silently refill it from
// disk regardless of what the test deleted. SEED_ADMIN_SKIP_DOTENV
// lets a test opt out of that file read entirely so "unset" tests stay
// meaningful even when a real .env.local exists (the normal case on
// any developer machine).
if (!process.env.SEED_ADMIN_SKIP_DOTENV) {
  loadEnvConfig(path.resolve(__dirname, ".."));
}

async function main(): Promise<void> {
  const reset = process.argv.includes("--reset");

  // Imported after loadEnvConfig() so getSeedEnv() sees the loaded
  // .env.local values, and imported dynamically so a missing-env exit
  // happens before anything tries to touch the database.
  const { getSeedEnv } = await import("@/lib/env");

  let email: string;
  let password: string;
  try {
    const env = getSeedEnv();
    email = env.ADMIN_EMAIL;
    password = env.ADMIN_PASSWORD;
  } catch (err) {
    console.log(err instanceof Error ? err.message : "Invalid environment configuration");
    process.exit(1);
  }

  const { connectDb } = await import("@/lib/db");
  const mongoose = (await import("mongoose")).default;

  try {
    await connectDb();
  } catch {
    console.log("Could not connect to the database");
    process.exit(1);
  }

  try {
    // Ensure the natural-key uniqueness constraint exists so FR-006
    // ("at most one admin account") holds even under concurrent runs —
    // the second concurrent insert fails on this index rather than on
    // an application-level race window.
    await mongoose.connection.db!.collection("user").createIndex({ email: 1 }, { unique: true });

    const { getAuth } = await import("@/lib/auth");
    const { logSecurityEvent } = await import("@/lib/log");
    const auth = await getAuth();
    const ctx = await auth.$context;

    const existing = await ctx.internalAdapter.findUserByEmail(email);

    if (!existing) {
      const hash = await ctx.password.hash(password);
      let user;
      try {
        user = await ctx.internalAdapter.createUser(
          { email, name: email.split("@")[0], emailVerified: true },
          { method: "email-password" },
        );
      } catch (err) {
        // Lost a concurrent race to another run's insert on the unique
        // email index (FR-006, SC-003).
        if (isDuplicateKeyError(err)) {
          console.log(`Admin already exists: ${email} (nothing changed)`);
          return;
        }
        throw err;
      }
      await ctx.internalAdapter.linkAccount({
        userId: user.id,
        providerId: "credential",
        accountId: user.id,
        password: hash,
      });
      console.log(`Admin created: ${email}`);
      return;
    }

    if (!reset) {
      console.log(`Admin already exists: ${email} (nothing changed)`);
      return;
    }

    const hash = await ctx.password.hash(password);
    await ctx.internalAdapter.updatePassword(existing.user.id, hash);
    await ctx.internalAdapter.deleteUserSessions(existing.user.id);
    logSecurityEvent({ type: "password_reset", email });
    console.log(`Admin password updated: ${email} (all sessions ended)`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    console.log("Seed failed");
    process.exit(1);
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code?: number }).code === 11000;
}

main();
