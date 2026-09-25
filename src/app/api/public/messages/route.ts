import { protectPublicForm, tooManyRequestsResponse } from "@/lib/public-form";
import { messageInputSchema } from "@/lib/validation/message";
import { fieldErrors } from "@/lib/validation/field-errors";
import { createMessage } from "@/lib/messages/mutations";
import { NO_STORE, validationResponse, unavailableResponse, payloadTooLargeResponse } from "@/lib/route-errors";

const MAX_BODY_BYTES = 65536;

/**
 * Public contact submission (contracts/public-contact-api.md). Order:
 * size guard → parse → honeypot → rate limit → validation → insert. The
 * success body is identical (`{ ok: true }`) whether a message was
 * stored or the honeypot silently dropped the request.
 */
export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return payloadTooLargeResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return validationResponse({});
  }

  if (typeof body !== "object" || body === null) {
    return validationResponse({});
  }

  const check = await protectPublicForm(request, { name: "contact" }, body as Record<string, unknown>);

  if (check.kind === "honeypot") {
    // Nothing is stored, and the response is indistinguishable from a
    // real success — a bot learns nothing from the difference.
    return Response.json({ ok: true }, { headers: NO_STORE });
  }

  if (check.kind === "limited") {
    return tooManyRequestsResponse(check.retryAfterSeconds);
  }

  const parsed = messageInputSchema.safeParse(body);
  if (!parsed.success) {
    return validationResponse(fieldErrors(parsed.error));
  }

  try {
    await createMessage(parsed.data);
  } catch {
    return unavailableResponse();
  }

  return Response.json({ ok: true }, { headers: NO_STORE });
}
