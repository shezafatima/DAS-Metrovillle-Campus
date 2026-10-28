import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import {
  PORTAL_LINKS_FIXTURE,
  clearSettings,
  clearSettingsChanges,
  panel,
  readSettingsChanges,
  readSettingsGroup,
  savedToast,
  seedPortalLinks,
} from "./helpers/settings";
import { LAYOUT_WIDTHS, expectNoHorizontalScroll, expectNoOverlap, setLayoutWidth } from "./helpers/layout";
import { settingsCopy } from "../src/content/admin";

/**
 * 014b US1: the footer's Portal Links are admin-managed (Settings → Site-wide),
 * saved like every other panel, opened safely in the footer, and hidden when
 * there are none. The old /portal/<slug> placeholders redirect to the home page.
 */

const PORTAL_PANEL = "portal-links";
const WARNING = "Visitors' browsers will mark this site as not secure.";
const SUFFIX = " (opens external site in a new tab)";

/** A value typed before React has taken the form over is wiped by hydration, so the fill is repeated until it holds. */
async function stableFill(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function openSiteWide(page: Page): Promise<Locator> {
  await page.goto("/admin/settings/site-wide#portal-links");
  const section = panel(page, PORTAL_PANEL);
  await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
  return section;
}

/** Opens the "Add link" panel and fills it; the dialog stays open for the caller to press Done. */
async function fillNewLink(page: Page, section: Locator, label: string, url: string): Promise<Locator> {
  await section.getByRole("button", { name: "Add link" }).click();
  const dialog = page.getByRole("dialog", { name: /Add link/ });
  await stableFill(dialog.getByLabel("Label"), label);
  await stableFill(dialog.getByLabel("Web address"), url);
  return dialog;
}

async function addLink(page: Page, section: Locator, label: string, url: string): Promise<void> {
  const dialog = await fillNewLink(page, section, label, url);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
}

function portalNav(page: Page): Locator {
  return page.getByRole("contentinfo").getByRole("navigation", { name: "Portal Links" });
}

async function storedLinks(): Promise<{ label: string; url: string }[]> {
  const stored = await readSettingsGroup("portalLinks");
  const links = (stored?.data.links ?? []) as { label: string; url: string; deletedAt: unknown }[];
  return links.filter((link) => !link.deletedAt).map(({ label, url }) => ({ label, url }));
}

test.describe("portal links — admin panel and footer (014b US1)", () => {
  test.beforeEach(async () => {
    await clearSettings();
    await clearSettingsChanges();
  });

  test("adds, reorders and saves links; the footer on every page shows them in order, opening a new tab safely", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openSiteWide(page);

    await addLink(page, section, "LMS App", "https://lms.example.org/");
    await addLink(page, section, "Student Login", "http://203.0.113.5/login");
    await addLink(page, section, "Mail Login", "https://mail.example.org/");
    await expect(section.getByTestId("panel-unsaved")).toBeVisible();

    // Move Mail Login to the top.
    await section.getByRole("button", { name: "Move link 3 up" }).click();
    await section.getByRole("button", { name: "Move link 2 up" }).click();

    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Portal links")).toBeVisible({ timeout: 60_000 });
    await expect(section.getByTestId("panel-unsaved")).toHaveCount(0);
    expect(await storedLinks()).toEqual([
      { label: "Mail Login", url: "https://mail.example.org/" },
      { label: "LMS App", url: "https://lms.example.org/" },
      { label: "Student Login", url: "http://203.0.113.5/login" },
    ]);

    for (const path of ["/", "/contact"]) {
      await page.goto(path);
      const nav = portalNav(page);
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(3);
      expect(await links.evaluateAll((els) => els.map((a) => a.getAttribute("href")))).toEqual([
        "https://mail.example.org/",
        "https://lms.example.org/",
        "http://203.0.113.5/login",
      ]);
      for (const a of await links.all()) {
        await expect(a).toHaveAttribute("target", "_blank");
        expect(await a.getAttribute("rel")).toContain("noopener");
        expect(await a.getAttribute("rel")).toContain("noreferrer");
      }
      await expect(nav.getByRole("link", { name: `LMS App${SUFFIX}` })).toBeVisible();
    }
  });

  test("unsafe and malformed addresses show an error at their field and cannot be saved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openSiteWide(page);

    for (const bad of ["javascript:alert(1)", "data:text/html,x", "/portal/x", "www.example.org", "https//broken", "https://user:pass@x.org"]) {
      const dialog = await fillNewLink(page, section, "Bad", bad);
      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog.getByText(/web address|username and password/i).first()).toBeVisible();
      await expect(dialog).toBeVisible();
      // Leaving a panel with edits asks first, with the browser's own confirm(). It blocks the page until answered (so the
      // click cannot return first): answer it from a listener, and check what it said afterwards.
      let asked = "";
      page.once("dialog", async (confirm) => {
        asked = confirm.message();
        await confirm.accept();
      });
      await dialog.getByRole("button", { name: "Cancel" }).click();
      await expect(dialog).toBeHidden();
      expect(asked).toBe(settingsCopy.list.panelUnsaved);
    }

    // Nothing was added to the form, so there is nothing to save.
    await expect(section.getByRole("button", { name: "Save" })).toBeDisabled();
    expect(await readSettingsGroup("portalLinks")).toBeNull();
  });

  test("an http:// address is accepted with a visible not-secure warning; https:// has none", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openSiteWide(page);

    const dialog = await fillNewLink(page, section, "Student Login", "http://203.0.113.5/login");
    await expect(dialog.getByText(WARNING)).toBeVisible();
    await stableFill(dialog.getByLabel("Web address"), "https://secure.example.org/");
    await expect(dialog.getByText(WARNING)).toHaveCount(0);
    await stableFill(dialog.getByLabel("Web address"), "http://203.0.113.5/login");
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(dialog).toBeHidden();

    // The warning stays on the saved card too.
    await expect(section.getByText(WARNING)).toBeVisible();
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Portal links")).toBeVisible({ timeout: 60_000 });
    expect(await storedLinks()).toEqual([{ label: "Student Login", url: "http://203.0.113.5/login" }]);
  });

  test("Test link opens the address in a new tab and leaves the panel unsaved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page, context } = await adminSession(browser);
    await context.route("https://lms.example.org/**", (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>LMS</title>ok" }));
    const section = await openSiteWide(page);
    await addLink(page, section, "LMS App", "https://lms.example.org/");

    const testLink = section.getByRole("link", { name: /^Test link/ });
    await expect(testLink).toHaveAttribute("target", "_blank");
    const [popup] = await Promise.all([context.waitForEvent("page"), testLink.click()]);
    await popup.waitForURL("https://lms.example.org/");
    await popup.close();

    await expect(section.getByTestId("panel-unsaved")).toBeVisible();
    await expect(section.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(await readSettingsGroup("portalLinks")).toBeNull();
  });

  test("two admins editing at once: the second save is a conflict and nothing is overwritten", async ({ browser }) => {
    test.setTimeout(300_000);
    const a = await adminSession(browser);
    const b = await adminSession(browser);
    const sectionA = await openSiteWide(a.page);
    const sectionB = await openSiteWide(b.page);

    await addLink(a.page, sectionA, "First", "https://first.example.org/");
    await sectionA.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(a.page, "Portal links")).toBeVisible({ timeout: 60_000 });

    await addLink(b.page, sectionB, "Second", "https://second.example.org/");
    await sectionB.getByRole("button", { name: "Save" }).click();
    await expect(b.page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    await expect(sectionB.getByTestId("panel-unsaved")).toBeVisible();
    expect(await storedLinks()).toEqual([{ label: "First", url: "https://first.example.org/" }]);
  });

  test("removing a link and saving keeps its previous value in the change record (spec FR-007)", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedPortalLinks(PORTAL_LINKS_FIXTURE.slice(0, 3));
    const { page } = await adminSession(browser);
    const section = await openSiteWide(page);

    await section.getByRole("button", { name: "Delete link: link 2" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Portal links")).toBeVisible({ timeout: 60_000 });

    const changes = await readSettingsChanges("portalLinks");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ panel: PORTAL_PANEL });
    expect(changes[0].removed).toMatchObject([{ path: "links.1", label: PORTAL_LINKS_FIXTURE[1].label, value: PORTAL_LINKS_FIXTURE[1] }]);
    expect((await storedLinks()).map((link) => link.label)).toEqual([PORTAL_LINKS_FIXTURE[0].label, PORTAL_LINKS_FIXTURE[2].label]);
  });

  test("removing every link hides the footer column and the other columns reflow", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedPortalLinks(PORTAL_LINKS_FIXTURE.slice(0, 2));
    const { page } = await adminSession(browser);
    const section = await openSiteWide(page);

    for (let remaining = 2; remaining > 0; remaining -= 1) {
      await section.getByRole("button", { name: "Delete link: link 1" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    }
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Portal links")).toBeVisible({ timeout: 60_000 });

    await setLayoutWidth(page, 1024);
    await page.goto("/contact");
    await expect(page.getByRole("contentinfo").getByRole("navigation", { name: "Quick Links" })).toBeVisible();
    await expect(portalNav(page)).toHaveCount(0);
    const columns = await page.getByRole("contentinfo").locator(":scope > div:first-child > *").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
    expect(columns).toHaveLength(3);
    expect(new Set(columns).size).toBe(3);
  });

  test("axe finds no violations on the Site-wide tab, with an http:// warning showing", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedPortalLinks(PORTAL_LINKS_FIXTURE);
    const { page } = await adminSession(browser);
    await openSiteWide(page);
    await expect(page.getByText(WARNING).first()).toBeVisible();
    const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
  });
});

test.describe("portal links — the public footer (014b US1)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("every old /portal address redirects permanently to the home page", async ({ request }) => {
    test.setTimeout(300_000);
    for (const path of ["/portal", ...["das-portal", "eportal", "student-login", "mail-login", "lms-app", "alumni-registration"].map((slug) => `/portal/${slug}`)]) {
      const response = await request.get(path, { timeout: 90_000, maxRedirects: 0 });
      expect(response.status(), path).toBe(308);
      expect(response.headers().location, path).toMatch(/^(https?:\/\/[^/]+)?\/$/);
    }
  });

  test("a followed old address ends on the home page", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/portal/lms-app", { timeout: 120_000 });
    await expect(page).toHaveURL(/\/$/);
  });

  for (const withLinks of [true, false]) {
    test(`the footer ${withLinks ? "with" : "without"} portal links: columns, no horizontal scroll, no overlap at every width`, async ({ page }) => {
      test.setTimeout(400_000);
      if (withLinks) await seedPortalLinks(PORTAL_LINKS_FIXTURE);
      const expectedColumns: Record<number, number> = withLinks ? { 375: 1, 640: 1, 768: 2, 1024: 4, 1440: 4 } : { 375: 1, 640: 1, 768: 2, 1024: 3, 1440: 3 };
      for (const width of LAYOUT_WIDTHS) {
        await setLayoutWidth(page, width);
        await page.goto("/contact", { timeout: 120_000 });
        const footer = page.getByRole("contentinfo");
        await footer.scrollIntoViewIfNeeded();
        await expectNoHorizontalScroll(page);
        await expectNoOverlap(page, footer);
        const columns = await footer.locator(":scope > div:first-child > *").evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().x)));
        expect(new Set(columns).size, `${width}px`).toBe(expectedColumns[width]);
        expect(columns.length, `${width}px`).toBe(withLinks ? 4 : 3);
        await expect(portalNav(page)).toHaveCount(withLinks ? 1 : 0);
      }
    });
  }
});
