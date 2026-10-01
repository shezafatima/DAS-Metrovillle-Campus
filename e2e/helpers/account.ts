import { execFileSync } from "node:child_process";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { E2E_ADMIN } from "../global-setup";

const projectRoot = path.resolve(__dirname, "../..");

/** Logs in through the real form and waits for the dashboard. */
export async function loginAs(page: Page, password: string = E2E_ADMIN.password): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  // The login action (scrypt verify + Atlas round-trips) routinely takes
  // longer than the default 5s against `next dev` on a slow disk; the
  // button stays disabled while it runs. Wait for it rather than flake.
  await expect(page).toHaveURL("/admin", { timeout: 30_000 });
}

/** Opens the top bar's profile menu (010) and returns the menu. */
export async function openProfileMenu(page: Page) {
  await page.getByRole("button", { name: "Account menu" }).click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  return menu;
}

/** Logs out through the profile menu, the only logout control since 010. */
export async function logoutViaProfileMenu(page: Page): Promise<void> {
  const menu = await openProfileMenu(page);
  await menu.getByRole("menuitem", { name: "Logout" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
}

/**
 * Puts the shared E2E admin's password back after a spec changed it, so
 * later admin specs can still log in. Runs the setup command's `--reset`
 * exactly as e2e/global-setup.ts runs it — test-only use of the manual
 * recovery path; nothing about the script itself changes. Also ends every
 * session, which is what the reset has always done.
 */
export function restoreAdminPassword(): void {
  execFileSync("npx", ["tsx", "scripts/seed-admin.ts", "--reset"], {
    cwd: projectRoot,
    // npx resolves to a .cmd shim on Windows, which execFile* can't
    // invoke directly without a shell.
    shell: process.platform === "win32",
    env: {
      ...process.env,
      MONGODB_DB_NAME: "dar_e_arqam_test",
      ADMIN_EMAIL: E2E_ADMIN.email,
      ADMIN_PASSWORD: E2E_ADMIN.password,
    },
    stdio: "pipe",
  });
}
