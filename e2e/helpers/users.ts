import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import mongoose from "mongoose";
import { E2E_ADMIN } from "../global-setup";
import { PERMISSION_LABELS, type Permission } from "../../src/lib/permissions";

/**
 * Helpers for the 011 roles specs. Accounts are created through the real
 * Users page (so US1 is exercised every time) and activated through the
 * real first-login page; the database is touched only to reset state
 * between specs and to age a temporary password.
 */
export interface CreatedUser {
  email: string;
  temporaryPassword: string;
}

async function withDb<T>(fn: (db: mongoose.mongo.Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  try {
    return await fn(mongoose.connection.db!);
  } finally {
    if (!wasConnected) await mongoose.disconnect().catch(() => {});
  }
}

/**
 * Removes every account except the shared E2E main admin (and puts that one
 * back to plain "active main admin"), plus the change record and throttles.
 * Call from beforeEach.
 */
export async function resetUsers(): Promise<void> {
  await withDb(async (db) => {
    const users = db.collection("user");
    const others = await users.find({ email: { $ne: E2E_ADMIN.email } }).toArray();
    const otherIds = new Set(others.map((u) => String(u._id)));
    await users.deleteMany({ email: { $ne: E2E_ADMIN.email } });
    for (const name of ["account", "session"]) {
      const collection = db.collection(name);
      const docs = await collection.find({}).toArray();
      const doomed = docs.filter((d) => otherIds.has(String(d.userId))).map((d) => d._id);
      if (doomed.length) await collection.deleteMany({ _id: { $in: doomed } });
    }
    await db.collection("userChanges").deleteMany({});
    await db.collection("throttles").deleteMany({});
    await users.updateOne(
      { email: E2E_ADMIN.email },
      { $set: { role: "main_admin", disabledAt: null, deletedAt: null } },
    );
  });
}

export async function getUserRow(email: string): Promise<Record<string, unknown> | null> {
  return withDb((db) => db.collection("user").findOne({ email }));
}

/** Logs in through the real form. Does not wait for a particular page: the caller knows where it should land. */
export async function submitLogin(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** A fresh browser context signed in as the shared E2E main admin. */
export async function adminSession(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await submitLogin(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await expect(page).toHaveURL("/admin", { timeout: 90_000 });
  return { context, page };
}

/** The right-hand panel for adding a user, or editing one. */
export function addUserPanel(page: Page) {
  return page.getByRole("dialog", { name: "Add user" });
}
export function editUserPanel(page: Page) {
  return page.getByRole("dialog", { name: "Edit user" });
}

/**
 * Adds an account through the Users page's panel and returns the password
 * that was set. With no `password`, the panel's Generate button makes one
 * (and reveals it, which is how the admin would read it out); with one, it
 * is typed. Either way it is only a temporary password.
 */
export async function createUserViaUi(
  adminPage: Page,
  {
    email,
    permissions = [],
    role = "content_manager",
    password,
  }: { email: string; permissions?: Permission[]; role?: "content_manager" | "main_admin"; password?: string },
): Promise<CreatedUser> {
  await adminPage.goto("/admin/users");
  await adminPage.getByRole("button", { name: "Add user" }).click();
  const panel = addUserPanel(adminPage);
  await expect(panel).toBeVisible();
  await panel.getByLabel("Email", { exact: true }).fill(email);
  if (role === "main_admin") await panel.getByRole("radio", { name: "Main admin" }).check();
  else for (const key of permissions) await panel.getByRole("checkbox", { name: PERMISSION_LABELS[key] }).check();

  const field = panel.locator("#user-password");
  if (password) {
    await field.fill(password);
  } else {
    await panel.getByRole("button", { name: "Generate" }).click();
  }
  const temporaryPassword = await field.inputValue();
  expect(temporaryPassword.length).toBeGreaterThanOrEqual(12);

  await panel.getByRole("button", { name: "Add user" }).click();
  // Saving closes the panel and the user is in the list straight away.
  await expect(panel).toBeHidden({ timeout: 90_000 });
  await expect(adminPage.getByTestId("user-row").filter({ hasText: email })).toBeVisible({ timeout: 90_000 });
  return { email, temporaryPassword };
}

/** Resets a user's password from the Edit panel. With no `password`, Generate makes one. Returns the password set. */
export async function resetPasswordViaPanel(adminPage: Page, email: string, password?: string): Promise<string> {
  await adminPage.goto("/admin/users");
  await adminPage.getByRole("button", { name: `Edit: ${email}` }).click();
  const panel = editUserPanel(adminPage);
  await expect(panel).toBeVisible();
  const field = panel.locator("#user-password");
  if (password) await field.fill(password);
  else await panel.getByRole("button", { name: "Generate" }).click();
  const set = await field.inputValue();
  await panel.getByRole("button", { name: "Save" }).click();
  await expect(panel).toBeHidden({ timeout: 90_000 });
  return set;
}

/**
 * Disables an account straight in the database WITHOUT ending its sessions, to
 * prove a disabled user holding a live cookie is refused on the next request.
 */
export async function disableUserRaw(email: string): Promise<void> {
  await withDb(async (db) => {
    await db.collection("user").updateOne({ email }, { $set: { disabledAt: new Date() } });
  });
}

/** The sidebar's link labels, in order. */
export async function sidebarLabels(page: Page): Promise<string[]> {
  const links = page.locator('[data-slot="sidebar-menu-button"]');
  await expect(links.first()).toBeVisible();
  return (await links.allTextContents()).map((text) => text.trim());
}

export interface SeededUser {
  email: string;
  /** Every seeded account signs in with the shared E2E admin password. */
  password: string;
}

/**
 * Inserts an ACTIVE account straight into the test database, sharing the E2E
 * admin's password hash, so a spec that is about access (not onboarding) can
 * have many differently-privileged users without a create + first-login
 * round trip each. Log in with `E2E_ADMIN.password`.
 */
export async function seedActiveUser({
  email,
  role = "content_manager",
  permissions = [],
}: {
  email: string;
  role?: "main_admin" | "content_manager";
  permissions?: Permission[];
}): Promise<SeededUser> {
  await withDb(async (db) => {
    const users = db.collection("user");
    const admin = await users.findOne({ email: E2E_ADMIN.email });
    if (!admin) throw new Error("the E2E admin is not seeded");
    const accounts = await db.collection("account").find({ providerId: "credential" }).toArray();
    const adminAccount = accounts.find((a) => String(a.userId) === String(admin._id));
    if (!adminAccount?.password) throw new Error("the E2E admin has no credential account");

    const now = new Date();
    const inserted = await users.insertOne({
      email,
      name: email.split("@")[0],
      emailVerified: true,
      role,
      permissions,
      disabledAt: null,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.collection("account").insertOne({
      userId: typeof adminAccount.userId === "string" ? String(inserted.insertedId) : inserted.insertedId,
      providerId: "credential",
      accountId: String(inserted.insertedId),
      password: adminAccount.password,
      createdAt: now,
      updatedAt: now,
    });
  });
  return { email, password: E2E_ADMIN.password };
}

/** A fresh context signed in as a seeded user, waiting for the page it lands on. */
export async function loginSeeded(
  browser: Browser,
  user: SeededUser,
  landing: string | RegExp = "/admin",
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await submitLogin(page, user.email, user.password);
  await expect(page).toHaveURL(landing, { timeout: 90_000 });
  return { context, page };
}

/** Puts one raw message and one raw signup into the test database, for the "no leakage" checks. */
export async function seedMessageAndSignup(): Promise<void> {
  await withDb(async (db) => {
    const now = new Date();
    await db.collection("messages").insertOne({
      name: "Sara Leakcheck",
      email: "sara-leak@example.test",
      phone: null,
      subject: "Leak check subject",
      body: "Body",
      status: "new",
      statusChangedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    await db.collection("signups").insertOne({
      name: "Ali Leakcheck",
      email: "ali-leak@example.test",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function clearMessagesAndSignups(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("messages").deleteMany({});
    await db.collection("signups").deleteMany({});
    await db.collection("adminNotificationStates").deleteMany({});
  });
}
