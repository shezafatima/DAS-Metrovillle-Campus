import { ValidationFailure, SlugConflictError, UploadVerificationError } from "@/lib/news/mutations";

/**
 * Maps the typed errors `src/lib/news/mutations.ts` throws onto the
 * envelope every `/api/admin/news*` route promises
 * (contracts/admin-news-api.md "Common error envelope"). Anything
 * unrecognised (a real DB outage, a driver error) becomes a generic
 * `503` — never a stack trace or connection detail.
 */
export function mutationErrorResponse(err: unknown): Response {
  const headers = { "Cache-Control": "no-store" };

  if (err instanceof ValidationFailure) {
    return Response.json({ error: "validation", fields: err.fields }, { status: 400, headers });
  }
  if (err instanceof SlugConflictError) {
    return Response.json(
      { error: "validation", fields: { slug: "This address is already in use." } },
      { status: 409, headers },
    );
  }
  if (err instanceof UploadVerificationError) {
    return Response.json({ error: "upload_verification_failed" }, { status: 502, headers });
  }
  return Response.json({ error: "unavailable" }, { status: 503, headers });
}
