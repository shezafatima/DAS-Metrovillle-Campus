// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(path.resolve(__dirname, "globals.css"), "utf-8");

describe("globals.css custom properties", () => {
  it("has no custom property that refers to itself (it is invalid, and text silently falls back to the browser's serif)", () => {
    const selfReferencing = [...css.matchAll(/(--[\w-]+)\s*:\s*var\(\s*(--[\w-]+)\s*[,)]/g)]
      .filter(([, name, target]) => name === target)
      .map(([, name]) => name);
    expect(selfReferencing).toEqual([]);
  });

  it("points the page-wide default font (font-sans, used by html) at a defined font token", () => {
    expect(css).toMatch(/--font-sans:\s*var\(--font-body\)/);
    expect(css).toMatch(/--font-body:\s*"softLINKS Regular"/);
  });
});
