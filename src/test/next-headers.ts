/**
 * A `next/headers` mock with both `headers()` and `cookies()`, the
 * cookies parsed from the same `cookie` header. The admin DAL reads the
 * session cookie through `cookies()` since 010 (dal.ts
 * getAuthRequestHeaders — `headers()` is stale in a Server Action's
 * re-render), so a mock of `headers()` alone no longer reaches it.
 *
 * Usage: vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })))
 */
export function mockNextHeaders(requestHeaders: Headers) {
  return {
    headers: async () => requestHeaders,
    cookies: async () => cookieStoreFrom(requestHeaders.get("cookie")),
  };
}

function cookieStoreFrom(cookieHeader: string | null) {
  const entries = (cookieHeader ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const eq = part.indexOf("=");
      return eq === -1 ? { name: part, value: "" } : { name: part.slice(0, eq), value: part.slice(eq + 1) };
    });
  return {
    getAll: () => entries,
    get: (name: string) => entries.find((entry) => entry.name === name),
    has: (name: string) => entries.some((entry) => entry.name === name),
  };
}
