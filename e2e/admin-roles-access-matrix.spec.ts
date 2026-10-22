import { test, expect, type Browser, type Page } from "@playwright/test";
import { E2E_ADMIN } from "./global-setup";
import { adminSession, disableUserRaw, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { OLD_SETTINGS_URLS, oldAlbumUrl } from "./helpers/settings";
import { PERMISSION_KEYS, type Access, type Permission } from "../src/lib/permissions";

/**
 * The page half of the three-case access matrix (Constitution XI),
 * mirroring specs/011-roles-and-users/contracts/access-matrix.md. The route
 * handlers' three cases live in src/app/api/admin/access-matrix.test.ts, the
 * Server Actions' in their own actions.test.ts files.
 */
const UNKNOWN_ID = "507f1f77bcf86cd799439011";

interface PageCase {
  path: string;
  access: Access;
}

const pages: PageCase[] = [
  { path: "/admin", access: "any" },
  { path: "/admin/account", access: "any" },
  { path: "/admin/news", access: "news" },
  { path: "/admin/news/new", access: "news" },
  { path: `/admin/news/${UNKNOWN_ID}`, access: "news" },
  { path: "/admin/messages", access: "messages" },
  { path: `/admin/messages/${UNKNOWN_ID}`, access: "messages" },
  { path: "/admin/careers", access: "careers" },
  // 012: one application (an unknown id: permitted users get the not-found page).
  { path: `/admin/careers/${UNKNOWN_ID}`, access: "careers" },
  // 014: Settings by page (specs/014-page-settings/contracts/access-matrix.md). The index opens for either
  // key and sends the user to their first tab (checked below, not here).
  { path: "/admin/settings/site-wide", access: "settings" },
  { path: "/admin/settings/home", access: "pages" },
  // 014b: the Syllabi (and later Examination) sections of the Academics page.
  { path: "/admin/settings/academics", access: "pages" },
  { path: "/admin/settings/admission", access: "settings_or_pages" },
  { path: "/admin/settings/resources", access: "pages" },
  // 007: an album screen (an unknown id: permitted users get the not-found state).
  { path: `/admin/settings/resources/gallery/${UNKNOWN_ID}`, access: "pages" },
  { path: "/admin/design-system", access: "main_admin" },
  { path: "/admin/users", access: "main_admin" },
  { path: "/admin/users/activity", access: "main_admin" },
];

/** The page opened and rendered (a detail page for an unknown id shows its own not-found state, with no fixed heading). */
async function expectRendered(page: Page, path: string) {
  await expect(page).toHaveURL(path);
  if (!path.includes(UNKNOWN_ID)) await expect(page.locator("h1").first()).toBeVisible();
}

const allExcept = (key: Permission): Permission[] => PERMISSION_KEYS.filter((k) => k !== key);

test.describe("roles — every admin page: no session, wrong role, correct role (011 Constitution XI)", () => {
  test.describe.configure({ mode: "serial" });

  const sessions = new Map<string, Page>();
  const password = E2E_ADMIN.password;

  async function pageFor(browser: Browser, email: string): Promise<Page> {
    const cached = sessions.get(email);
    if (cached) return cached;
    const { page } = await loginSeeded(browser, { email, password }, "/admin");
    sessions.set(email, page);
    return page;
  }

  test.beforeAll(async () => {
    // 014: thirteen users against the remote test database outlast the 30s hook default.
    test.setTimeout(180_000);
    await resetUsers();
    await seedActiveUser({ email: "none@example.test" });
    await seedActiveUser({ email: "everything@example.test", permissions: [...PERMISSION_KEYS] });
    for (const key of ["news", "messages", "careers", "settings", "pages"] as const) {
      await seedActiveUser({ email: `only-${key}@example.test`, permissions: [key] });
      await seedActiveUser({ email: `all-but-${key}@example.test`, permissions: allExcept(key) });
    }
    // 014: every grant except the two that open Settings.
    await seedActiveUser({ email: "all-but-settings_or_pages@example.test", permissions: ["news", "messages", "careers"] });
  });

  for (const { path, access } of pages) {
    test.describe(`${path} (${access})`, () => {
      test("1. no session → the login page, remembering where you were going", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(path);
        await expect(page).toHaveURL(`/admin/login?next=${encodeURIComponent(path)}`);
        await context.close();
      });

      if (access === "any") {
        test("2. no role can be wrong here, so: an account disabled while holding a live cookie → the login page", async ({ browser }) => {
          test.setTimeout(180_000);
          const email = `disabled-${path.replace(/\W+/g, "-")}@example.test`;
          await seedActiveUser({ email });
          const page = await pageFor(browser, email);
          await disableUserRaw(email);
          await page.goto(path);
          await expect(page).toHaveURL(/\/admin\/login/);
        });

        test("3. a content manager with no grants → the page opens", async ({ browser }) => {
          test.setTimeout(180_000);
          const page = await pageFor(browser, "none@example.test");
          await page.goto(path);
          await expect(page).toHaveURL(path);
          await expectRendered(page, path);
        });
      } else {
        const wrongEmail = access === "main_admin" ? "everything@example.test" : `all-but-${access}@example.test`;
        test(`2. wrong role or missing permission (${wrongEmail}) → the overview with the denied message`, async ({ browser }) => {
          test.setTimeout(180_000);
          const page = await pageFor(browser, wrongEmail);
          await page.goto(path);
          await expect(page).toHaveURL("/admin?denied=1");
        });

        test("3. correct role or permission → the page opens, not redirected", async ({ browser }) => {
          test.setTimeout(180_000);
          if (access === "main_admin") {
            const { page } = await adminSession(browser);
            await page.goto(path);
            await expect(page).toHaveURL(path);
            await expectRendered(page, path);
            return;
          }
          // settings_or_pages: each of the two keys alone opens the page.
          const holders = access === "settings_or_pages" ? ["only-settings@example.test", "only-pages@example.test"] : [`only-${access}@example.test`];
          for (const email of holders) {
            const page = await pageFor(browser, email);
            await page.goto(path);
            await expect(page, email).toHaveURL(path);
            await expectRendered(page, path);
          }
        });
      }
    });
  }

  // 014: /admin/settings opens for either key and sends each user to their first tab.
  test.describe("/admin/settings (settings_or_pages, redirects to the first tab)", () => {
    test("1. no session → the login page, remembering where you were going", async ({ browser }) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto("/admin/settings");
      await expect(page).toHaveURL(`/admin/login?next=${encodeURIComponent("/admin/settings")}`);
      await context.close();
    });
    test("2. neither settings nor pages → the overview with the denied message", async ({ browser }) => {
      test.setTimeout(180_000);
      const page = await pageFor(browser, "all-but-settings_or_pages@example.test");
      await page.goto("/admin/settings");
      await expect(page).toHaveURL("/admin?denied=1");
    });
    test("3. settings → Site-wide; pages → Home", async ({ browser }) => {
      test.setTimeout(180_000);
      const settings = await pageFor(browser, "only-settings@example.test");
      await settings.goto("/admin/settings");
      await expect(settings).toHaveURL("/admin/settings/site-wide");
      const pages = await pageFor(browser, "only-pages@example.test");
      await pages.goto("/admin/settings");
      await expect(pages).toHaveURL("/admin/settings/home");
    });
  });

  // 014 US3: every old Settings URL, with the same three cases as the page it now leads to.
  for (const url of [...OLD_SETTINGS_URLS, oldAlbumUrl(UNKNOWN_ID)]) {
    test.describe(`old URL ${url.from} → ${url.to} (${url.needs})`, () => {
      test("1. no session → the login page for the destination", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(url.from);
        // The browser keeps the old URL fragment through the redirects.
        await expect(page).toHaveURL(`/admin/login?next=${encodeURIComponent(url.to)}${url.hash ? `#${url.hash}` : ""}`);
        await context.close();
      });
      test("2. missing permission → the overview with the denied message", async ({ browser }) => {
        test.setTimeout(180_000);
        const page = await pageFor(browser, `all-but-${url.needs}@example.test`);
        await page.goto(url.from);
        await expect(page).toHaveURL(`/admin?denied=1${url.hash ? `#${url.hash}` : ""}`);
      });
      test("3. correct permission → the new page", async ({ browser }) => {
        test.setTimeout(180_000);
        const page = await pageFor(browser, `only-${url.needs}@example.test`);
        await page.goto(url.from);
        await expect(page).toHaveURL(url.hash ? `${url.to}#${url.hash}` : url.to);
      });
    });
  }
});
