// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { describeWithDb } from "@/test/db";

describeWithDb("GET /api/health (reachable)", [], () => {
  it("returns 200 { status: 'ok' } and no other keys", async () => {
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Object.keys(body)).toEqual(["status"]);
    expect(body.status).toBe("ok");
  });
});

describe("GET /api/health (unreachable)", () => {
  afterEach(() => {
    vi.doUnmock("@/lib/db");
    vi.resetModules();
  });

  it("returns 503 with no technical details when the database is unreachable", async () => {
    const fakeConnectionDetail = "mongodb+srv://user:s3cr3t@cluster0.example.mongodb.net";
    vi.doMock("@/lib/db", () => ({
      connectDb: async () => {
        throw new Error(`connect ECONNREFUSED ${fakeConnectionDetail}`);
      },
    }));

    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toEqual({ status: "unavailable" });

    const responseText = JSON.stringify(body);
    expect(responseText).not.toContain(fakeConnectionDetail);
    expect(responseText).not.toContain("s3cr3t");
  });
});
