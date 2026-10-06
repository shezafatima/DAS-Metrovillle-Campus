import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { freshReadsForTests } from "@/lib/e2e-fresh-reads";
import { listLatestPosts, type PublicPostSummary } from "./public-queries";

/**
 * Latest News for the home page (006 FR-013–FR-017).
 *
 *  - The same visibility rule as the News pages (listLatestPosts reuses
 *    publicVisibilityFilter), so drafts and deleted posts never appear.
 *  - Cached for 60 s, tagged `news`; every admin news write calls
 *    revalidateNewsCaches(), so a publish shows on the home page at once and
 *    anything else within a minute.
 *  - Never throws: a failed or slow (> 3 s) read gives [], which hides the
 *    section (FR-016). The cached function itself throws, so a failure is
 *    never cached.
 */

export const NEWS_TAG = "news";
export const HOME_NEWS_LIMIT = 6;
const READ_TIMEOUT_MS = 3000;

const cachedLatest = unstable_cache(async () => listLatestPosts(HOME_NEWS_LIMIT), ["news", "latest", String(HOME_NEWS_LIMIT)], {
  revalidate: 60,
  tags: [NEWS_TAG],
});

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("latest news read timed out")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export async function getLatestPosts(): Promise<PublicPostSummary[]> {
  try {
    // Test-only: Playwright specs seed posts directly (src/lib/e2e-fresh-reads.ts).
    const read = freshReadsForTests() ? listLatestPosts(HOME_NEWS_LIMIT) : cachedLatest();
    return await withTimeout(read, READ_TIMEOUT_MS);
  } catch (error) {
    unstable_rethrow(error);
    console.warn(JSON.stringify({ at: new Date().toISOString(), kind: "home", type: "latest_news_read_failed" }));
    return [];
  }
}

/**
 * Called by every admin news write (create, update, publish, unpublish,
 * delete). Best effort: outside a Next request (unit tests) revalidation is
 * not available, and a failed revalidation must never fail the write itself.
 */
export function revalidateNewsCaches(): void {
  try {
    revalidateTag(NEWS_TAG, { expire: 0 });
    revalidatePath("/");
  } catch {
    // not in a Next request context
  }
}
