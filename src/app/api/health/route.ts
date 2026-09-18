import { connectDb } from "@/lib/db";

export const dynamic = "force-dynamic";

const PING_TIMEOUT_MS = 2000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("health check timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Reports only "healthy" or "unavailable" (FR-032). No connection
 * details, error text, host names, or versions ever reach the response
 * — the catch block below discards whatever error it receives.
 */
export async function GET() {
  try {
    const mongoose = await connectDb();
    await withTimeout(mongoose.connection.db!.admin().ping(), PING_TIMEOUT_MS);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
