/**
 * Next.js calls register() once at server startup (both `next dev` and
 * `next start`). Validating the environment here means a missing or
 * invalid value fails the process immediately, naming exactly which
 * variable is wrong, instead of surfacing as a confusing runtime error
 * the first time some request happens to touch the database (FR-033).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getEnv } = await import("@/lib/env");
    getEnv();
  }
}
