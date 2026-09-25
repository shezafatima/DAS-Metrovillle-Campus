/**
 * Shared response envelope for public and admin route handlers —
 * mirrors src/lib/news/route-errors.ts's shape (contracts "Common error
 * envelope"). Every response is `Cache-Control: no-store` so nothing
 * about an outcome is ever cached.
 */
export const NO_STORE = { "Cache-Control": "no-store" };

export function validationResponse(fields: Record<string, string>): Response {
  return Response.json({ error: "validation", fields }, { status: 400, headers: NO_STORE });
}

export function unavailableResponse(): Response {
  return Response.json({ error: "unavailable" }, { status: 503, headers: NO_STORE });
}

export function notFoundResponse(): Response {
  return Response.json({ error: "not_found" }, { status: 404, headers: NO_STORE });
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "unauthorized" }, { status: 401, headers: NO_STORE });
}

export function payloadTooLargeResponse(): Response {
  return Response.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
}
