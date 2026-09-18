import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { E2E_ADMIN } from "./global-setup";

const projectRoot = path.resolve(__dirname, "..");

function runSeed(): string {
  return execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], {
    cwd: projectRoot,
    // npx resolves to a .cmd shim on Windows, which execFile* can't
    // invoke directly without a shell (spawnSync npx ENOENT).
    shell: process.platform === "win32",
    env: {
      ...process.env,
      MONGODB_DB_NAME: "dar_e_arqam_test",
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
    },
  }).toString();
}

// Runs serially: both cases share the one admin account the whole
// suite is seeded with, and re-running the seed command must be
// provably idempotent (spec Acceptance "the setup command never
// creates a second admin").
test.describe.configure({ mode: "serial" });

test.describe("admin account setup (US1)", () => {
  test("the seed command is idempotent — running it again reports 'already exists'", () => {
    const first = runSeed();
    expect(first).toContain("already exists");

    const second = runSeed();
    expect(second).toContain("already exists");
  });

  test("the sign-up API route is disabled (FR-001)", async ({ request }) => {
    const response = await request.post("/api/auth/sign-up/email", {
      data: {
        email: "should-not-be-created@example.com",
        password: "another-password-12345",
        name: "Should Not Exist",
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("EMAIL_PASSWORD_SIGN_UP_DISABLED");
  });
});
