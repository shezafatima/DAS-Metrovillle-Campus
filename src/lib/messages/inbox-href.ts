import { isMessageStatus } from "@/lib/messages/statuses";

const BASE = "/admin/messages";

/**
 * Rebuilds the inbox URL from an untrusted `from` query string, keeping
 * only whitelisted keys with valid values (research §8). Never returns
 * anything but `/admin/messages[?…]` — protects the detail page's back
 * link against an open redirect.
 */
export function inboxHref(from?: string | null): string {
  const params = new URLSearchParams(from ?? "");
  const kept = new URLSearchParams();

  const q = params.get("q")?.trim();
  if (q) kept.set("q", q);

  const status = params.get("status");
  if (status && isMessageStatus(status)) kept.set("status", status);

  const pageRaw = params.get("page");
  if (pageRaw !== null) {
    const page = Number(pageRaw);
    if (Number.isInteger(page) && page >= 2) kept.set("page", String(page));
  }

  const query = kept.toString();
  return query ? `${BASE}?${query}` : BASE;
}
