import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import { clearSignups, loginAsAdmin, seedSignups } from "./helpers/signups";

test.describe("admin exports signups (US6)", () => {
  test.beforeEach(async () => {
    await clearSignups();
  });

  test("downloads a CSV with the filtered rows, BOM, and Urdu/punctuated names intact", async ({ page }) => {
    await seedSignups([
      { name: 'Ali "AK" Khan, Jr.', email: "ak-khan@example.com", phone: "+923001234567", sources: ["home"] },
      { name: "علی خان", email: "urdu-khan@example.com", phone: "+923009999999", sources: ["home"] },
      { name: "Someone Else", email: "excluded@example.com", phone: "+923008888888", sources: ["resources"] },
    ]);

    await loginAsAdmin(page);
    await page.goto("/admin/signups");
    await page.getByLabel("Page").selectOption("home");
    // The Export link's href is server-rendered from the URL's search
    // params; selectOption triggers a client-side navigation that must
    // finish (updating the URL and re-rendering the link) before the
    // href reflects the filter.
    await expect(page).toHaveURL(/[?&]source=home/);
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute("href", /source=home/);

    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("link", { name: "Export CSV" }).click(),
    ]);

    expect(download.suggestedFilename()).toMatch(/^signups-\d{4}-\d{2}-\d{2}\.csv$/);

    const filePath = await download.path();
    expect(filePath).not.toBeNull();
    const buffer = fs.readFileSync(filePath!);

    // BOM check on raw bytes (text decoding would strip it).
    expect(buffer.subarray(0, 3)).toEqual(Buffer.from([0xef, 0xbb, 0xbf]));

    const text = buffer.toString("utf-8");
    expect(text).toContain('"Ali ""AK"" Khan, Jr."');
    expect(text).toContain("علی خان");
    expect(text).not.toContain("Someone Else");

    const lines = text.split("\r\n").filter(Boolean);
    expect(lines).toHaveLength(3); // header + 2 home-sourced rows
  });

  test("the export route rejects unauthenticated requests", async ({ page }) => {
    const response = await page.request.get("/api/admin/signups/export");
    expect(response.status()).toBe(401);
  });
});
