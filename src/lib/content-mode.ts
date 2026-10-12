import "server-only";
import { cookies } from "next/headers";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { showPlaceholders } from "@/lib/content/placeholders";

/**
 * Whether this request may show development placeholders. `cookies()` is read
 * only under the test-only guard, so production pages never touch it and stay
 * static (017 research R4). The cookie `e2e-production-content=1` makes a dev
 * server behave as production for the E2E specs. Used by /about and /academics.
 */
export async function placeholdersAllowed(): Promise<boolean> {
  const forceProduction = freshReadsForTests() && (await cookies()).get("e2e-production-content")?.value === "1";
  return showPlaceholders({ nodeEnv: process.env.NODE_ENV, forceProduction });
}
