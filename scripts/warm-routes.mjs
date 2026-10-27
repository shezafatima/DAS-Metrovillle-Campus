/**
 * Warms every route of a running `next dev` server before Playwright starts, so the first compile of a
 * page never eats a test's timeout (CI only; usage: `node scripts/warm-routes.mjs [baseUrl]`).
 *
 * The route list comes from src/app: every page.tsx, and every route.ts under api/. A dynamic segment
 * gets a placeholder value, so the route still compiles even though it answers 404 or a login redirect.
 *
 * Pass rule, per kind:
 *  - pages: the server must answer 200 or 3xx. A 404 is accepted only for a page with a dynamic segment
 *    (the placeholder id does not exist).
 *  - API routes: any answer below 500 (a 405 or 401 for a bare GET proves the route compiled).
 * One request at a time: the dev server compiles on demand and parallel compiles only make it slower.
 */
import { readdirSync, statSync } from "node:fs";
import path from "node:path";

const base = (process.argv[2] ?? "http://localhost:3100").replace(/\/$/, "");
const appDir = path.resolve(process.cwd(), "src/app");
const PER_ROUTE_TIMEOUT_MS = 5 * 60_000;
const READY_TIMEOUT_MS = 8 * 60_000;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** "(public)/news/[slug]/page.tsx" → "/news/x"; route groups vanish, "[...all]" takes a few segments. */
function toUrl(relative) {
  const segments = path
    .dirname(relative)
    .split(path.sep)
    .filter((segment) => segment !== "." && !(segment.startsWith("(") && segment.endsWith(")")))
    .map((segment) => (segment.startsWith("[...") ? "x/y" : segment.startsWith("[") ? "x" : segment));
  return "/" + segments.join("/");
}

const routes = walk(appDir)
  .map((file) => path.relative(appDir, file))
  .filter((file) => /(^|[\\/])(page\.tsx|route\.ts)$/.test(file))
  .map((file) => ({ url: toUrl(file), api: /(^|[\\/])route\.ts$/.test(file), dynamic: file.includes("[") }))
  .sort((a, b) => a.url.localeCompare(b.url));

async function waitForServer() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      await fetch(base, { redirect: "manual", signal: AbortSignal.timeout(180_000) });
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2_000));
    }
  }
  throw new Error(`Server at ${base} did not answer within ${READY_TIMEOUT_MS / 1000}s`);
}

function acceptable(route, status) {
  if (status < 0) return false;
  if (route.api) return status < 500;
  if (status === 200 || (status >= 300 && status < 400)) return true;
  return route.dynamic && status === 404;
}

await waitForServer();
const failures = [];
for (const route of routes) {
  const started = Date.now();
  let status = 0;
  try {
    status = (await fetch(base + route.url, { redirect: "manual", signal: AbortSignal.timeout(PER_ROUTE_TIMEOUT_MS) })).status;
  } catch (error) {
    status = -1;
    console.log(`  ${route.url}: ${error instanceof Error ? error.name : "error"}`);
  }
  const ok = acceptable(route, status);
  console.log(`${ok ? "ok  " : "FAIL"} ${String(status).padStart(3)} ${route.url} (${((Date.now() - started) / 1000).toFixed(1)}s)`);
  if (!ok) failures.push(`${route.url} → ${status}`);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} route(s) did not warm:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`\nWarmed ${routes.length} routes.`);
