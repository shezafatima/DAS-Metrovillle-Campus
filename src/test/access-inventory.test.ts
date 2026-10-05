// @vitest-environment node
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The access inventory (011, Constitution III/XI). Walks every admin page,
 * route handler and Server Action file on disk and fails if
 *   - one is missing from EXPECTED below (a new admin entry point cannot
 *     slip in without someone deciding who may use it), or
 *   - it does not call the DAL check for exactly the access listed, once
 *     per exported handler/action.
 *
 * EXPECTED mirrors specs/011-roles-and-users/contracts/access-matrix.md.
 * The route handlers' three access cases live in
 * src/app/api/admin/access-matrix.test.ts; the Server Actions' in their
 * own actions.test.ts files; the pages' in e2e/admin-roles-access-matrix.spec.ts.
 */
type Expected =
  | { kind: "page"; access: string }
  | { kind: "route"; access: string }
  // `perAccess` is for an actions file whose actions ask for different access: on the
  // account page, changing a password is main-admin only (011: the main admin controls
  // every password) while signing out one's own other devices is open to any role.
  | { kind: "action"; access: string; perAccess?: Record<string, number> }
  | { kind: "public" | "none" };

const app = path.resolve(__dirname, "../app");

const EXPECTED: Record<string, Expected> = {
  // pages
  "admin/(dashboard)/page.tsx": { kind: "page", access: "any" },
  "admin/(dashboard)/account/page.tsx": { kind: "page", access: "any" },
  "admin/(dashboard)/news/page.tsx": { kind: "page", access: "news" },
  "admin/(dashboard)/news/new/page.tsx": { kind: "page", access: "news" },
  "admin/(dashboard)/news/[id]/page.tsx": { kind: "page", access: "news" },
  "admin/(dashboard)/messages/page.tsx": { kind: "page", access: "messages" },
  "admin/(dashboard)/messages/[id]/page.tsx": { kind: "page", access: "messages" },
  // 012 careers: the Applications list and one application.
  "admin/(dashboard)/careers/page.tsx": { kind: "page", access: "careers" },
  "admin/(dashboard)/careers/[id]/page.tsx": { kind: "page", access: "careers" },
  "admin/(dashboard)/settings/page.tsx": { kind: "page", access: "settings" },
  // 005: one page per settings group; settings/layout.tsx is not an access gate (each page checks).
  "admin/(dashboard)/settings/contact/page.tsx": { kind: "page", access: "settings" },
  "admin/(dashboard)/settings/hero/page.tsx": { kind: "page", access: "settings" },
  "admin/(dashboard)/settings/stats/page.tsx": { kind: "page", access: "settings" },
  "admin/(dashboard)/settings/video/page.tsx": { kind: "page", access: "settings" },
  "admin/(dashboard)/settings/gallery/page.tsx": { kind: "page", access: "settings" },  // 007: now the album list
  // 007: one album's photos.
  "admin/(dashboard)/settings/gallery/[albumId]/page.tsx": { kind: "page", access: "settings" },
  "admin/(dashboard)/design-system/page.tsx": { kind: "page", access: "main_admin" },
  "admin/(dashboard)/users/page.tsx": { kind: "page", access: "main_admin" },
  "admin/(dashboard)/users/activity/page.tsx": { kind: "page", access: "main_admin" },
  "admin/login/page.tsx": { kind: "public" },
  // route handlers
  "api/admin/session/route.ts": { kind: "route", access: "any" },
  "api/admin/notifications/route.ts": { kind: "route", access: "any" },
  "api/admin/notifications/read/route.ts": { kind: "route", access: "any" },
  "api/admin/news/route.ts": { kind: "route", access: "news" },
  "api/admin/news/[id]/route.ts": { kind: "route", access: "news" },
  "api/admin/news/[id]/publish/route.ts": { kind: "route", access: "news" },
  "api/admin/news/[id]/unpublish/route.ts": { kind: "route", access: "news" },
  "api/admin/uploads/sign/route.ts": { kind: "route", access: "news" },
  "api/admin/settings/uploads/sign/route.ts": { kind: "route", access: "settings" },
  "api/admin/messages/[id]/route.ts": { kind: "route", access: "messages" },
  "api/admin/messages/[id]/read/route.ts": { kind: "route", access: "messages" },
  // 012 careers: the CV download. Only the careers permission may fetch a CV.
  "api/admin/careers/[id]/cv/route.ts": { kind: "route", access: "careers" },
  // Deleting is main-admin only: it is what lets a person apply again inside the reapply window.
  "api/admin/careers/[id]/route.ts": { kind: "route", access: "main_admin" },
  "api/admin/careers/export/route.ts": { kind: "route", access: "careers" },
  "api/admin/careers/opened/route.ts": { kind: "route", access: "careers" },
  // Server Actions
  "admin/(dashboard)/actions.ts": { kind: "none" }, // logout: harmless without a session
  "admin/(dashboard)/account/actions.ts": {
    kind: "action",
    access: "main_admin",
    perAccess: { main_admin: 1, any: 1 },
  },
  "admin/(dashboard)/users/actions.ts": { kind: "action", access: "main_admin" },
  "admin/(dashboard)/settings/actions.ts": { kind: "action", access: "settings" },
  // 007: the nine album and photo actions.
  "admin/(dashboard)/settings/gallery/actions.ts": { kind: "action", access: "settings" },
  "admin/login/actions.ts": { kind: "public" },
};

/**
 * Entry points that belong to a later phase of 011 and are validated as
 * soon as they exist. Empty now: every 011 entry point is built, so a
 * missing file fails the test.
 */
const NOT_YET_BUILT = new Set<string>([]);

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const ENTRY_FILE = /(^|\/)(page\.tsx|route\.ts|actions\.ts)$/;

function entryFilesOnDisk(): string[] {
  return [...walk(path.join(app, "admin")), ...walk(path.join(app, "api/admin"))]
    .map((f) => path.relative(app, f).split(path.sep).join("/"))
    .filter((f) => ENTRY_FILE.test(f))
    .sort();
}

function count(source: string, pattern: RegExp): number {
  return [...source.matchAll(pattern)].length;
}

describe("admin access inventory", () => {
  it("every admin page, route handler and Server Action file is in the access matrix", () => {
    const unlisted = entryFilesOnDisk().filter((f) => !(f in EXPECTED));
    expect(unlisted, `add these to EXPECTED (and to contracts/access-matrix.md): ${unlisted.join(", ")}`).toEqual([]);
  });

  it("every entry in the matrix exists, except those not yet built", () => {
    const onDisk = new Set(entryFilesOnDisk());
    const missing = Object.keys(EXPECTED).filter((f) => !onDisk.has(f) && !NOT_YET_BUILT.has(f));
    expect(missing).toEqual([]);
  });

  describe.each(Object.entries(EXPECTED))("%s", (file, expected) => {
    const full = path.join(app, file);
    if (!existsSync(full)) {
      it.skip("not yet built", () => {});
      return;
    }
    const source = readFileSync(full, "utf8");

    if (expected.kind === "page") {
      it(`calls requireAdminPage("${expected.access}") exactly once`, () => {
        // Only real awaited calls count — a comment may mention the helper.
        expect(count(source, /await requireAdminPage\(/g)).toBe(1);
        expect(source).toContain(`await requireAdminPage("${expected.access}")`);
      });
    } else if (expected.kind === "route") {
      it(`calls requireAdminAccess("${expected.access}") once per exported handler`, () => {
        const handlers = count(source, /^export async function (GET|POST|PUT|PATCH|DELETE)\b/gm);
        expect(handlers).toBeGreaterThan(0);
        expect(count(source, /await requireAdminAccess\(/g)).toBe(handlers);
        expect(count(source, new RegExp(`await requireAdminAccess\\("${expected.access}"\\)`, "g"))).toBe(handlers);
      });
    } else if (expected.kind === "action") {
      it(`calls requireAdminAccess("${expected.access}") once per exported action`, () => {
        expect(source).toMatch(/^"use server";/);
        const actions = count(source, /^export async function \w+/gm);
        expect(actions).toBeGreaterThan(0);
        expect(count(source, /await requireAdminAccess\(/g)).toBe(actions);
        const wanted = expected.perAccess ?? { [expected.access]: actions };
        for (const [access, times] of Object.entries(wanted)) {
          expect(count(source, new RegExp(`await requireAdminAccess\\("${access}"\\)`, "g")), `${access} checks`).toBe(times);
        }
      });
    } else {
      it(`is deliberately ${expected.kind}`, () => {
        expect(source).not.toContain("requireAdminPage(");
      });
    }
  });

  it("the old single-purpose session check is gone everywhere in src (011 FR-007)", () => {
    const needle = "require" + "AdminSession";
    const src = path.resolve(__dirname, "..");
    const offenders = walk(src)
      .filter((f) => /\.(ts|tsx)$/.test(f))
      .filter((f) => readFileSync(f, "utf8").includes(needle))
      .map((f) => path.relative(src, f));
    expect(offenders).toEqual([]);
  });

  it("the dashboard layout is not relied on as an access gate: it only asks for 'any'", () => {
    const layout = readFileSync(path.join(app, "admin/(dashboard)/layout.tsx"), "utf8");
    expect(layout).toContain('requireAdminPage("any")');
  });
});
