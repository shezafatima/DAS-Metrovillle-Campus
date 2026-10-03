import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";

const projectRoot = path.resolve(__dirname, "..");

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.com";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "correct-horse-battery-staple";

function warnDbUnavailable(reason: string): void {
  // No usable database for this run. The public-site specs
  // (001-site-shell) have no DB dependency and can still run; the
  // admin specs (which need a seeded admin) will fail on their own
  // with a clear connection error rather than silently passing, and
  // without aborting the whole suite.
  console.warn(
    `[e2e global-setup] ${reason} — skipping DB reset and admin seed. ` +
      "Admin specs will fail; public-site specs are unaffected.",
  );
}

/**
 * Runs once before the whole Playwright suite: points every test at a
 * dedicated test database, wipes it clean, and seeds the one admin
 * account the specs log in as. Exported alongside `clearThrottle()` so
 * individual specs (e.g. the lockout spec) can reset just the throttle
 * collection between test cases without re-seeding the admin.
 */
export default async function globalSetup() {
  loadEnvConfig(projectRoot);
  process.env.MONGODB_DB_NAME = "dar_e_arqam_test";
  process.env.ADMIN_EMAIL = E2E_ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD = E2E_ADMIN_PASSWORD;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    warnDbUnavailable("MONGODB_URI not set");
    return;
  }

  try {
    await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
    for (const name of [
      "user",
      "session",
      "account",
      "throttles",
      "news",
      "signups",
      "messages",
      "adminNotificationStates",
      "userChanges",
      "settings",
      "careerApplications",
      "careerApplicationLocks",
    ]) {
      try {
        await mongoose.connection.db?.collection(name).deleteMany({});
      } catch {
        // Collection doesn't exist yet — nothing to clear.
      }
    }
    await mongoose.disconnect();
    // 012 careers: stored CVs from earlier runs (the E2E document store directory).
    rmSync(path.join(projectRoot, ".data/e2e-documents"), { recursive: true, force: true });

    execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], {
      cwd: projectRoot,
      // npx resolves to a .cmd shim on Windows, which execFile* can't
      // invoke directly without a shell (spawnSync npx ENOENT).
      shell: process.platform === "win32",
      env: {
        ...process.env,
        MONGODB_DB_NAME: "dar_e_arqam_test",
        ADMIN_EMAIL: E2E_ADMIN_EMAIL,
        ADMIN_PASSWORD: E2E_ADMIN_PASSWORD,
      },
      stdio: "inherit",
    });
  } catch (err) {
    await mongoose.disconnect().catch(() => {});
    warnDbUnavailable(err instanceof Error ? err.message : "Could not reach the database");
  }
}

/** Clears only the throttle collection — used between lockout test cases. */
export async function clearThrottle(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) return;
  const wasConnected = mongoose.connection.readyState !== 0;
  try {
    if (!wasConnected) {
      await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
    }
    await mongoose.connection.db?.collection("throttles").deleteMany({});
  } finally {
    if (!wasConnected) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

export const E2E_ADMIN = { email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD };
