// @vitest-environment node
import { expect, it } from "vitest";
import { describeWithDb } from "@/test/db";
import { Signup } from "@/models/signup";
import { listSignups, countSignups, findSignupsForExport } from "@/lib/signup/admin-queries";

async function seed(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return Signup.create({
    name: "Person",
    email: `person-${Math.random().toString(36).slice(2)}@example.com`,
    phone: "+923001234567",
    sources: ["home"],
    firstSignupAt: now,
    lastSignupAt: now,
    ...overrides,
  });
}

describeWithDb("listSignups", ["signups"], () => {
  it("orders by latest signup date, newest first", async () => {
    await seed({ name: "Older", lastSignupAt: new Date("2026-01-01T00:00:00Z") });
    await seed({ name: "Newer", lastSignupAt: new Date("2026-06-01T00:00:00Z") });
    const result = await listSignups();
    expect(result.items[0]!.name).toBe("Newer");
    expect(result.items[1]!.name).toBe("Older");
  });

  it("matches a name fragment case-insensitively", async () => {
    await seed({ name: "Ali Khan", email: "match-khan@example.com" });
    await seed({ name: "Sara Ahmed", email: "no-match@example.com" });
    const result = await listSignups({ q: "khan" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.email).toBe("match-khan@example.com");
  });

  it("matches an Urdu name fragment", async () => {
    await seed({ name: "علی خان", email: "urdu-name@example.com" });
    const result = await listSignups({ q: "علی" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.email).toBe("urdu-name@example.com");
  });

  it("matches by email fragment", async () => {
    await seed({ email: "findme@example.com" });
    const result = await listSignups({ q: "findme@ex" });
    expect(result.items).toHaveLength(1);
  });

  it("matches phone regardless of how it was typed", async () => {
    await seed({ phone: "+923001234567", email: "phone-match@example.com" });
    const bySpaced = await listSignups({ q: "0300 123" });
    const byIntl = await listSignups({ q: "+92 300 123" });
    expect(bySpaced.items.map((i) => i.email)).toContain("phone-match@example.com");
    expect(byIntl.items.map((i) => i.email)).toContain("phone-match@example.com");
  });

  it("does not throw when the query has no usable phone digits", async () => {
    await expect(listSignups({ q: "zz" })).resolves.not.toThrow();
  });

  it("filters by source", async () => {
    await seed({ sources: ["resources"], email: "resources-only@example.com" });
    await seed({ sources: ["home"], email: "home-only@example.com" });
    const result = await listSignups({ source: "resources" });
    expect(result.items.every((i) => i.sources.includes("resources"))).toBe(true);
    expect(result.items.some((i) => i.email === "home-only@example.com")).toBe(false);
  });

  it("treats an unknown source value like 'all'", async () => {
    await seed({ sources: ["home"] });
    const all = await listSignups();
    const bogus = await listSignups({ source: "bogus" });
    expect(bogus.total).toBe(all.total);
  });

  it("paginates 45 records into 20 + 20 + 5", async () => {
    for (let i = 0; i < 45; i++) {
      await seed({ lastSignupAt: new Date(Date.UTC(2026, 0, i + 1)) });
    }
    const page3 = await listSignups({ page: 3 });
    expect(page3.totalPages).toBe(3);
    expect(page3.items).toHaveLength(5);
  });

  it("excludes a soft-deleted record from the list, the count and the export", async () => {
    const doc = await seed({ email: "deleted@example.com" });
    await Signup.softDeleteById(doc._id);

    const list = await listSignups();
    expect(list.items.some((i) => i.email === "deleted@example.com")).toBe(false);

    const count = await countSignups();
    expect(count).toBe(0);

    const exported = await findSignupsForExport();
    expect(exported.some((i) => i.email === "deleted@example.com")).toBe(false);
  });

  it("counts only live records", async () => {
    await seed();
    await seed();
    expect(await countSignups()).toBe(2);
  });

  // Performance (SC-006): finding one person among 100+ by name, email or
  // phone must take under 1 second.
  it("resolves common searches in under 1 second over 120 records", async () => {
    const seeds = Array.from({ length: 120 }, (_, i) => ({
      name: i === 60 ? "Ali Khan" : `Person ${i}`,
      email: i === 60 ? "ali@example.com" : `person-${i}@example.com`,
      phone: "+923001234567",
      sources: ["home"] as const,
      firstSignupAt: new Date(),
      lastSignupAt: new Date(),
    }));
    await Signup.insertMany(seeds);

    // One untimed warm-up call so connection setup doesn't count against the budget.
    await listSignups({ q: "warmup" });

    for (const q of ["khan", "ali@", "0300 12"]) {
      const start = performance.now();
      await listSignups({ q });
      expect(performance.now() - start).toBeLessThan(1000);
    }
  });
});
