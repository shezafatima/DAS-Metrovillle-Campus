// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 014b (spec FR-046, SC-005): the /portal/<slug> placeholder pages are retired,
 * so nothing in the app may link to a /portal/... address. Walks every source
 * file except tests and fails on one that contains such an address, so a link
 * to a retired page cannot come back.
 */
const root = path.resolve(__dirname, "..");
const isTest = (file: string) => /\.test\.[tj]sx?$/.test(file);
const isSource = (file: string) => /\.[tj]sx?$/.test(file) && !isTest(file);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe("no links to the retired /portal pages (014b)", () => {
  it("no source file mentions a /portal/ address", () => {
    const offenders = walk(root)
      .filter(isSource)
      .filter((file) => /["'`]\/portal(\/|["'`])/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("the placeholder route is gone", () => {
    expect(() => statSync(path.join(root, "app", "(public)", "portal"))).toThrow();
  });
});
