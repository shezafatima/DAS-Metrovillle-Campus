/**
 * Shared response envelope for public and admin route handlers —
 * mirrors src/lib/news/route-errors.ts's shape (contracts "Common error
 * envelope"). Every response is `Cache-Control: no-store` so nothing
 * about an outcome is ever cached.
 */
import type { AccessDenial } from "@/lib/dal";

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

/** 403 for a signed-in user who may not use this section (011 FR-009). No section data, ever. */
export function forbiddenResponse(): Response {
  return Response.json({ error: "forbidden" }, { status: 403, headers: NO_STORE });
}

/** Turns a DAL refusal into the response the contract fixes: 401 for no session, else 403. */
export function accessErrorResponse(reason: AccessDenial): Response {
  return reason === "unauthorized" ? unauthorizedResponse() : forbiddenResponse();
}

export function payloadTooLargeResponse(): Response {
  return Response.json({ error: "too_large" }, { status: 413, headers: NO_STORE });
}
