import { protectPublicForm, tooManyRequestsResponse } from "@/lib/public-form";
import { signupInputSchema, fieldErrors } from "@/lib/validation/signup";
import { upsertSignup } from "@/lib/signup/mutations";
import { NO_STORE, validationResponse, unavailableResponse } from "@/lib/signup/route-errors";

/**
 * Public lead-capture submission (contracts/public-signup-api.md).
 * Order: honeypot → rate limit → validation → upsert. The success body
 * is identical (`{ ok: true }`) whether the record was created,
 * updated, restored, or the submission was silently dropped by the
 * honeypot — nothing distinguishes a new signup from a returning one
 * (FR-008, SC-004).
 */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({});
  }

  if (typeof body !== "object" || body === null) {
    return validationResponse({});
  }

  const check = await protectPublicForm(request, { name: "signup" }, body as Record<string, unknown>);

  if (check.kind === "honeypot") {
    // Nothing is stored, and the response is indistinguishable from a
    // real success (FR-025) — a bot learns nothing from the difference.
    return Response.json({ ok: true }, { headers: NO_STORE });
  }

  if (check.kind === "limited") {
    return tooManyRequestsResponse(check.retryAfterSeconds);
  }

  const parsed = signupInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationResponse(fieldErrors(parsed.error));
  }

  try {
    await upsertSignup(parsed.data);
  } catch {
    return unavailableResponse();
  }

  return Response.json({ ok: true }, { headers: NO_STORE });
}
