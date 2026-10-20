import { spawnSync } from "node:child_process";
import path from "node:path";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { EXAMINATION_FIXTURE, PORTAL_LINKS_FIXTURE, clearSettings, isGroupPending, panel, readSettingsGroup, savedToast, seedPendingGroup } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014b US6: content copied from the reference site is marked "pending client confirmation". The panel says so
 * until someone with the panel's permission uses "Mark as confirmed by client"; saving never clears it. The
 * seed scripts are checked here as a real command against the test database.
 */

const ROOT = path.resolve(__dirname, "..");
const NOTICE = "Copied from das.edu.pk /reference-page/";

async function stableFill(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function openExamination(page: Page): Promise<Locator> {
  await page.goto("/admin/settings/academics#examination");
  const section = panel(page, "examination");
  await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
  return section;
}

async function confirmThroughDialog(page: Page, section: Locator): Promise<void> {
  await section.getByRole("button", { name: "Mark as confirmed by client" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Mark this section as confirmed by the client?");
  await page.getByRole("alertdialog").getByRole("button", { name: "Mark as confirmed" }).click();
}

const blocks = () => EXAMINATION_FIXTURE.map((block) => ({ id: crypto.randomUUID(), deletedAt: null, ...block }));

test.describe("seeded content — the pending notice and Mark as confirmed (014b US6)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("the editor sees the notice; saving keeps it; Mark as confirmed clears it for good", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedPendingGroup("examination", { blocks: blocks() });
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await expect(section.getByTestId("pending-notice")).toContainText(NOTICE);
    await expect(section.getByTestId("pending-notice")).toContainText("Saving changes does not clear this notice");

    await stableFill(section.getByTestId("list-item").first().getByLabel("Heading"), "Nursery and Prep (edited)");
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Examination")).toBeVisible({ timeout: 60_000 });
    await expect(section.getByTestId("pending-notice")).toBeVisible();
    expect(await isGroupPending("examination")).toBe(true);

    await confirmThroughDialog(page, section);
    await expect(section.getByTestId("pending-notice")).toHaveCount(0);
    await expect(page.getByText("Examination marked as confirmed by the client").last()).toBeVisible();
    expect(await isGroupPending("examination")).toBe(false);

    await page.reload();
    await expect(panel(page, "examination").locator("form")).toBeVisible({ timeout: 90_000 });
    await expect(panel(page, "examination").getByTestId("pending-notice")).toHaveCount(0);
    expect(((await readSettingsGroup("examination"))?.data.blocks as { heading: string }[])[0].heading).toBe("Nursery and Prep (edited)");
  });

  test("cancelling the question keeps the notice", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedPendingGroup("examination", { blocks: blocks() });
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await section.getByRole("button", { name: "Mark as confirmed by client" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(section.getByTestId("pending-notice")).toBeVisible();
    expect(await isGroupPending("examination")).toBe(true);
  });

  test("a section that was not seeded shows no notice", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await expect(section.getByTestId("pending-notice")).toHaveCount(0);
  });

  test("seeded Portal links: the notice shows, and the http:// address shows the not-secure warning", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedPendingGroup("portalLinks", { links: PORTAL_LINKS_FIXTURE.map((link) => ({ id: crypto.randomUUID(), deletedAt: null, ...link })) });
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/site-wide#portal-links");
    const section = panel(page, "portal-links");
    await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
    await expect(section.getByTestId("pending-notice")).toBeVisible();
    await expect(section.getByText("Visitors' browsers will mark this site as not secure.")).toHaveCount(1);

    await confirmThroughDialog(page, section);
    await expect(section.getByTestId("pending-notice")).toHaveCount(0);
    expect(await isGroupPending("portalLinks")).toBe(false);
  });

  test("a Pages-only manager confirms Syllabi and Examination; the Portal links panel is out of reach", async ({ browser }) => {
    test.setTimeout(400_000);
    await resetUsers();
    await seedPendingGroup("examination", { blocks: blocks() });
    await seedPendingGroup("portalLinks", { links: [] });
    const user = await seedActiveUser({ email: "pages-confirm@example.test", permissions: ["pages"] });
    const { page } = await loginSeeded(browser, user);
    const section = await openExamination(page);
    await confirmThroughDialog(page, section);
    await expect(section.getByTestId("pending-notice")).toHaveCount(0);
    expect(await isGroupPending("examination")).toBe(false);
    expect(await isGroupPending("portalLinks")).toBe(true);
    await page.goto("/admin/settings/site-wide");
    await expect(page).toHaveURL("/admin?denied=1", { timeout: 90_000 });
  });

  test("the notice and Mark as confirmed are not part of the public site", async ({ page }) => {
    test.setTimeout(300_000);
    await seedPendingGroup("examination", { blocks: blocks() });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/academics#examination", { timeout: 180_000 });
    await expect(page.locator("#examination")).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText(/pending|awaits the client/i)).toHaveCount(0);
    await expect(page.getByText(settingsCopy.pending.confirmButton)).toHaveCount(0);
  });
});

/** Runs a seed command the way the owner will: through npm's tsx script, against the test database. */
function seed(args: string[]): { status: number | null; out: string } {
  const result = spawnSync("npx", ["tsx", "scripts/seed-sections.ts", ...args], {
    cwd: ROOT,
    env: { ...process.env, MONGODB_DB_NAME: "dar_e_arqam_test" },
    encoding: "utf8",
    shell: true,
    timeout: 240_000,
  });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

test.describe("seed:sections as a command (014b US6)", () => {
  test.describe.configure({ mode: "serial" });
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterAll(async () => {
    await clearSettings();
  });

  test("with no section it prints the usage and exits 2; an unknown section too", async () => {
    test.setTimeout(300_000);
    for (const args of [[], ["class-levels"]]) {
      const result = seed(args);
      expect(result.status).toBe(2);
      expect(result.out).toContain("Usage: npm run seed:sections");
    }
  });

  test("a dry run says what it would write, names the database, and writes nothing", async () => {
    test.setTimeout(300_000);
    const result = seed(["portal-links"]);
    expect(result.status).toBe(0);
    expect(result.out).toMatch(/Database: dar_e_arqam_test on /);
    expect(result.out).toContain("Dry run: nothing written");
    expect(result.out).toContain("Student Login -> http://");
    expect(result.out).toContain("Plain http:// addresses");
    expect(await readSettingsGroup("portalLinks")).toBeNull();
  });

  test("--confirm writes, the panel shows it as pending, and a second --confirm refuses with exit 1 and changes nothing", async ({ browser }) => {
    test.setTimeout(500_000);
    const first = seed(["examination", "--confirm"]);
    expect(first.status).toBe(0);
    expect(first.out).toContain("Written.");
    expect(await isGroupPending("examination")).toBe(true);
    const stored = await readSettingsGroup("examination");
    expect((stored?.data.blocks as unknown[]).length).toBe(4);

    const second = seed(["examination", "--confirm"]);
    expect(second.status).toBe(1);
    expect(second.out).toContain("already has content; nothing written");
    expect((await readSettingsGroup("examination"))?.version).toBe(stored?.version);

    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await expect(section.getByTestId("pending-notice")).toContainText("Copied from https://das.edu.pk/academics/examinations/");
    await expect(section.getByTestId("list-item")).toHaveCount(4);
  });

  test("seeded syllabi: all eleven levels load in the editor and show on the public page", async ({ browser, page: publicPage }) => {
    test.setTimeout(500_000);
    expect(seed(["syllabi", "--confirm"]).status).toBe(0);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/academics#syllabi");
    const section = panel(page, "syllabi");
    await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
    await expect(section.getByTestId("syllabus-level")).toHaveCount(11);
    await expect(section.getByTestId("pending-notice")).toBeVisible();

    await publicPage.setViewportSize({ width: 1024, height: 900 });
    await publicPage.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(publicPage.getByRole("tab")).toHaveCount(11, { timeout: 90_000 });
    await expect(publicPage.getByRole("tab").first()).toHaveText("Play Group");
  });
});
