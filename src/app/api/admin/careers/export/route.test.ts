// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { seedApplication } from "@/test/career-applications";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const EMAIL = "careers-export-manager@example.test";
const PASSWORD = "correct-horse-battery-staple";

describeWithDb("GET /api/admin/careers/export", ["careerApplications", "user", "account", "session"], () => {
  let GET: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    await seedTestContentManager(EMAIL, PASSWORD, ["careers"]);
    const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    ({ GET } = (await import("./route")) as never);
  });

  const download = (query = "") => GET(new Request(`http://localhost/api/admin/careers/export${query}`));
  const lines = async (response: Response) => (await response.text()).split("\r\n").filter(Boolean);

  it("answers with an attachment CSV that opens correctly in Excel", async () => {
    await seedApplication({ name: "Ayesha Khan" });
    const response = await download();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="applications-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(response.headers.get("cache-control")).toBe("no-store");
    // Check the raw bytes: Response.text() would strip the byte-order mark Excel needs.
    const bytes = new Uint8Array(await response.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  });

  it("includes every matching application, not just one page", async () => {
    for (let i = 0; i < 45; i++) await seedApplication({ name: `Match ${i}` });
    await seedApplication({ name: "Other" });

    expect((await lines(await download())).length).toBe(1 + 46);
    expect((await lines(await download("?q=Match"))).length).toBe(1 + 45);
  });

  it("leaves out pending and deleted applications", async () => {
    await seedApplication({ name: "Visible" });
    await seedApplication({ name: "Pending", storedAt: null });
    await seedApplication({ name: "Deleted", deletedAt: new Date() });

    const text = (await lines(await download())).join("\n");
    expect(text).toContain("Visible");
    expect(text).not.toContain("Pending");
    expect(text).not.toContain("Deleted");
  });

  it("keeps Urdu names and has headers only when nothing matches", async () => {
    await seedApplication({ name: "عائشہ خان" });
    expect(await (await download()).text()).toContain('"عائشہ خان"');

    const none = await lines(await download("?q=zzzz-no-match"));
    expect(none).toHaveLength(1);
  });

  it("contains no file data and no storage key", async () => {
    const { key } = await seedApplication({ name: "Ayesha Khan" });
    const text = await (await download()).text();
    expect(text).not.toContain(key);
    expect(text).not.toMatch(/cv\/|\.pdf|%PDF/);
  });
});
