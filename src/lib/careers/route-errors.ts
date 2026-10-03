import { NO_STORE } from "@/lib/route-errors";

/**
 * Public careers responses (contracts/public-careers-api.md). None of them
 * ever carries an id, a storage key, a stored value, or which field
 * (email or phone) matched.
 */

/** 409: the person applied within the reapply window; `reapplyFrom` is a `YYYY-MM-DD` Pakistan date. */
export function alreadyAppliedResponse(reapplyFrom: string): Response {
  return Response.json({ error: "already_applied", reapplyFrom }, { status: 409, headers: NO_STORE });
}

/** 503: the document store failed; nothing was saved. */
export function storeUnavailableResponse(): Response {
  return Response.json({ error: "store_unavailable" }, { status: 503, headers: NO_STORE });
}

/** 503: an identity lock was busy, or an unfinished earlier upload is still being cleared. */
export function tryAgainResponse(): Response {
  return Response.json({ error: "try_again" }, { status: 503, headers: NO_STORE });
}
