// @vitest-environment node
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { describeWithDb } from "@/test/db";

const execFileAsync = promisify(execFile);
const projectRoot = path.resolve(__dirname, "..");
const ADMIN_EMAIL = "seed-test-admin@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

// npx resolves to a .cmd shim on Windows, which execFile* can't invoke
// directly without a shell (spawnSync npx ENOENT).
const shell = process.platform === "win32";

function runSeed(extraArgs: string[] = [], env: Record<string, string> = {}) {
  return execFileAsync("npx", ["tsx", "scripts/seed-admin.ts", ...extraArgs], {
    cwd: projectRoot,
    shell,
    env: {
      ...process.env,
      MONGODB_DB_NAME: "dar_e_arqam_test",
      ADMIN_EMAIL,
      ADMIN_PASSWORD,
      ...env,
    },
  });
}

describeWithDb("seed-admin script", ["user", "account", "session"], () => {
  it(
    "creates the admin on a fresh database",
    async () => {
      const { stdout } = await runSeed();
      expect(stdout).toContain("Admin created:");
      const count = await mongoose.connection.db!.collection("user").countDocuments();
      expect(count).toBe(1);
    },
    90_000,
  );

  it(
    "reports 'already exists' and changes nothing on a second run",
    async () => {
      await runSeed();
      const { stdout } = await runSeed();
      expect(stdout).toContain("already exists");
      const count = await mongoose.connection.db!.collection("user").countDocuments();
      expect(count).toBe(1);
    },
    90_000,
  );

  it(
    "creates the account as a main admin (011)",
    async () => {
      await runSeed();
      const user = await mongoose.connection.db!.collection("user").findOne({ email: ADMIN_EMAIL });
      expect(user?.role).toBe("main_admin");
    },
    90_000,
  );

  it(
    "makes a pre-011 account (no role) a main admin and changes nothing else",
    async () => {
      await runSeed();
      await mongoose.connection.db!
        .collection("user")
        .updateOne({ email: ADMIN_EMAIL }, { $unset: { role: "" } });
      const { stdout } = await runSeed();
      expect(stdout).toContain("Admin role confirmed:");
      const user = await mongoose.connection.db!.collection("user").findOne({ email: ADMIN_EMAIL });
      expect(user?.role).toBe("main_admin");
    },
    90_000,
  );

  it(
    "--reset recovers a disabled or deleted main admin (011)",
    async () => {
      await runSeed();
      await mongoose.connection.db!.collection("user").updateOne(
        { email: ADMIN_EMAIL },
        {
          $set: {
            role: "content_manager",
            disabledAt: new Date(),
            deletedAt: new Date(),
          },
        },
      );
      await runSeed(["--reset"]);
      const user = await mongoose.connection.db!.collection("user").findOne({ email: ADMIN_EMAIL });
      expect(user?.role).toBe("main_admin");
      expect(user?.disabledAt ?? null).toBeNull();
      expect(user?.deletedAt ?? null).toBeNull();
    },
    90_000,
  );

  it(
    "--reset replaces the password and ends all sessions",
    async () => {
      await runSeed();
      const user = await mongoose.connection.db!.collection("user").findOne({ email: ADMIN_EMAIL });
      await mongoose.connection.db!.collection("session").insertOne({
        userId: user!._id,
        token: "fake-session-token",
        expiresAt: new Date(Date.now() + 100_000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const newPassword = "a-completely-different-password-456";
      const { stdout } = await runSeed(["--reset"], { ADMIN_PASSWORD: newPassword });
      expect(stdout).toContain("password updated");
      expect(stdout).toContain("all sessions ended");

      const count = await mongoose.connection.db!.collection("user").countDocuments();
      expect(count).toBe(1);
      const sessionCount = await mongoose.connection.db!
        .collection("session")
        .countDocuments({ userId: user!._id });
      expect(sessionCount).toBe(0);

      const { getAuth } = await import("@/lib/auth");
      const auth = await getAuth();
      const okWithNew = await auth.api
        .signInEmail({ body: { email: ADMIN_EMAIL, password: newPassword } })
        .then(() => true)
        .catch(() => false);
      expect(okWithNew).toBe(true);

      const failsWithOld = await auth.api
        .signInEmail({ body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } })
        .then(() => false)
        .catch(() => true);
      expect(failsWithOld).toBe(true);
    },
    90_000,
  );

  it(
    "10 concurrent runs leave exactly one admin (FR-006, SC-003)",
    async () => {
      await Promise.all(Array.from({ length: 10 }, () => runSeed().catch((e) => e)));
      const count = await mongoose.connection.db!.collection("user").countDocuments();
      expect(count).toBe(1);
    },
    90_000,
  );

  it(
    "names the missing variable when ADMIN_EMAIL is unset",
    async () => {
      const env = {
        ...process.env,
        MONGODB_DB_NAME: "dar_e_arqam_test",
        ADMIN_PASSWORD,
        SEED_ADMIN_SKIP_DOTENV: "1",
      };
      delete env.ADMIN_EMAIL;
      let stdout = "";
      let failed = false;
      try {
        const result = execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], { cwd: projectRoot, env, shell });
        stdout = result.toString();
      } catch (err) {
        failed = true;
        stdout = (err as { stdout?: Buffer }).stdout?.toString() ?? "";
      }
      expect(failed).toBe(true);
      expect(stdout).toContain("ADMIN_EMAIL");
    },
    90_000,
  );

  it(
    "refuses an 11-character password with the minimum-length message",
    async () => {
      const env = {
        ...process.env,
        MONGODB_DB_NAME: "dar_e_arqam_test",
        ADMIN_EMAIL,
        ADMIN_PASSWORD: "1234567890a",
        SEED_ADMIN_SKIP_DOTENV: "1",
      };
      let stdout = "";
      let failed = false;
      try {
        const result = execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], { cwd: projectRoot, env, shell });
        stdout = result.toString();
      } catch (err) {
        failed = true;
        stdout = (err as { stdout?: Buffer }).stdout?.toString() ?? "";
      }
      expect(failed).toBe(true);
      expect(stdout).toContain("ADMIN_PASSWORD must be at least 12 characters");
    },
    90_000,
  );

  it(
    "stores a mixed-case email in lower-cased form",
    async () => {
      const env = { ADMIN_EMAIL: " Mixed-Case-Admin@Example.COM " };
      await runSeed([], env);
      const found = await mongoose.connection.db!
        .collection("user")
        .findOne({ email: "mixed-case-admin@example.com" });
      expect(found).not.toBeNull();
    },
    90_000,
  );
});

// This one test intentionally runs without a DB requirement, so it still
// executes even when MONGODB_URI is unset — it just checks the process
// fails before attempting any connection.
describe("seed-admin script (no DB required)", () => {
  it(
    "fails fast when required env vars are entirely absent",
    () => {
      const env = { ...process.env, SEED_ADMIN_SKIP_DOTENV: "1" };
      delete env.MONGODB_URI;
      delete env.ADMIN_EMAIL;
      delete env.ADMIN_PASSWORD;
      let failed = false;
      let stdout = "";
      try {
        const result = execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], { cwd: projectRoot, env, shell });
        stdout = result.toString();
      } catch (err) {
        failed = true;
        stdout = (err as { stdout?: Buffer }).stdout?.toString() ?? "";
      }
      expect(failed).toBe(true);
      expect(stdout).toContain("Missing required environment variable:");
    },
    90_000,
  );
});
