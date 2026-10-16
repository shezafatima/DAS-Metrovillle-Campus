import { after } from "next/server";
import { registrationCopy } from "@/content/registration";
import { logSecurityEvent } from "@/lib/log";
import { protectPublicForm, tooManyRequestsResponse } from "@/lib/public-form";
import { newReference } from "@/lib/registration/reference";
import { getRegistrationAvailability } from "@/lib/registration/availability";
import { createRegistration } from "@/lib/registration/mutations";
import { maybeSweepRegistrations } from "@/lib/registration/retention";
import { NO_STORE, payloadTooLargeResponse, unavailableResponse, validationResponse } from "@/lib/route-errors";
import { fieldErrors } from "@/lib/validation/field-errors";
import { buildRegistrationSchema } from "@/lib/validation/registration";

const MAX_BODY_BYTES = 65536;

/**
 * Public registration (contracts/public-registration-api.md). Order: size
 * guard → parse → honeypot → rate limit → open? → validation → insert. A
 * closed window is refused before validation, so every body gets the same
 * 403. No response and no log line ever carries a submitted value: failures
 * log the event type only.
 */
export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) return payloadTooLargeResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({});
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) return validationResponse({});

  let availability: Awaited<ReturnType<typeof getRegistrationAvailability>>;
  try {
    const check = await protectPublicForm(request, { name: "registration" }, body as Record<string, unknown>);
    if (check.kind === "honeypot") {
      // Nothing is stored; the response looks like a real success.
      return Response.json({ ok: true, reference: newReference() }, { headers: NO_STORE });
    }
    if (check.kind === "limited") return tooManyRequestsResponse(check.retryAfterSeconds);
    availability = await getRegistrationAvailability();
  } catch {
    logSecurityEvent({ type: "registration_save_failed", outcome: "precheck" });
    return unavailableResponse();
  }

  if (!availability.open) {
    return Response.json(
      { error: "closed", message: registrationCopy.banners.closed },
      { status: 403, headers: NO_STORE },
    );
  }

  const parsed = buildRegistrationSchema({ classes: availability.classes, today: availability.today }).safeParse(body);
  if (!parsed.success) return validationResponse(fieldErrors(parsed.error));

  let created: { id: string; reference: string };
  try {
    created = await createRegistration(parsed.data, availability.now);
  } catch {
    // Never the error message: a database error can echo the values.
    logSecurityEvent({ type: "registration_save_failed", outcome: "insert" });
    return unavailableResponse();
  }

  after(() => maybeSweepRegistrations());
  return Response.json({ ok: true, reference: created.reference }, { headers: NO_STORE });
}
