import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mobileApps } from "./index";

/** The reference text as plain text (docs/content-source/resources/README.md): line 1 heading, line 2 body. */
function lines(): string[] {
  const raw = readFileSync(path.join(process.cwd(), "docs/content-source/resources/mobile-apps.txt"), "utf8");
  return raw.replace(/^﻿/, "").replace(/\r\n/g, "\n").split("\n");
}

describe("fidelity to the reference", () => {
  it("Mobile Apps heading and body are the reference's, word for word", () => {
    const [heading, body] = lines();
    expect(mobileApps.heading).toBe(heading);
    expect(mobileApps.body).toBe(body);
  });
});
