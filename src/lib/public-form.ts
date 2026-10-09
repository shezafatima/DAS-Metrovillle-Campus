import { checkRateLimit, PUBLIC_FORM_POLICY } from "@/lib/rate-limit";
import { isHoneypotTripped } from "@/lib/honeypot";

export type PublicFormCheckResult =
  | { kind: "ok" }
  | { kind: "limited"; retryAfterSeconds: number }
  | { kind: "honeypot" };

export function extractIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Reusable public-form protection (FR-031): rate limiting plus a hidden
 * spam-trap field. Later features (003–007) call this before writing a
 * public submission to the database.
 */
export async function protectPublicForm(
  request: Request,
  options: { name: string; max?: number; windowSeconds?: number },
  body?: FormData | Record<string, unknown>,
): Promise<PublicFormCheckResult> {
  if (isHoneypotTripped(body)) {
    return { kind: "honeypot" };
  }

  const ip = extractIp(request);
  const key = `form:${options.name}:ip:${ip}`;
  const { allowed, retryAfterSeconds } = await checkRateLimit({
    key,
    max: options.max ?? PUBLIC_FORM_POLICY.max,
    windowSeconds: options.windowSeconds ?? PUBLIC_FORM_POLICY.windowSeconds,
  });

  if (!allowed) {
    return { kind: "limited", retryAfterSeconds };
  }

  return { kind: "ok" };
}

/** Standard 429 response for a `{ kind: "limited" }` result. */
export function tooManyRequestsResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "too_many_requests" },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
