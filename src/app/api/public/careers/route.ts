import { after } from "next/server";
import { extractIp, protectPublicForm, tooManyRequestsResponse } from "@/lib/public-form";
import { checkRateLimit } from "@/lib/rate-limit";
import { careersCopy } from "@/content/careers";
import { CAREERS_BODY_MAX_BYTES, verifyPdfBytes, type CvFailure } from "@/lib/careers/cv-limits";
import {
  LockBusyError,
  RecentApplicationError,
  StaleUploadError,
  createCareerApplication,
} from "@/lib/careers/mutations";
import { maybeSweepCareers } from "@/lib/careers/retention";
import { formDataFrom, readCappedBody } from "@/lib/careers/read-capped-body";
import { alreadyAppliedResponse, storeUnavailableResponse, tryAgainResponse } from "@/lib/careers/route-errors";
import { DocumentStoreUnavailableError } from "@/lib/documents/store";
import { careerApplicationFieldsSchema } from "@/lib/validation/career-application";
import { fieldErrors } from "@/lib/validation/field-errors";
import { NO_STORE, payloadTooLargeResponse, unavailableResponse, validationResponse } from "@/lib/route-errors";

// Uploads per address per day: a second, slower budget on top of the 5-in-10-minutes submission limit.
const UPLOAD_LIMIT = { max: 10, windowSeconds: 86_400 };

const CV_MESSAGES: Record<CvFailure, string> = {
  empty: careersCopy.fieldErrors.cv.empty,
  too_large: careersCopy.fieldErrors.cv.tooLarge,
  not_pdf: careersCopy.fieldErrors.cv.notPdf,
};

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Public application (contracts/public-careers-api.md). Order: size guard →
 * capped read → parse → honeypot → submission limit → upload limit → validation (fields and
 * the PDF's real content) → save. The success body is identical
 * (`{ ok: true }`) whether an application was stored or the honeypot
 * silently dropped the request.
 */
export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > CAREERS_BODY_MAX_BYTES) return payloadTooLargeResponse();

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data")) return validationResponse({});

  const bytes = await readCappedBody(request, CAREERS_BODY_MAX_BYTES);
  if (bytes === "too_large") return payloadTooLargeResponse();

  let form: FormData;
  try {
    form = await formDataFrom(bytes, contentType);
  } catch {
    return validationResponse({});
  }

  const check = await protectPublicForm(request, { name: "careers" }, form);
  if (check.kind === "honeypot") {
    // Nothing is stored, and the response is indistinguishable from a real
    // success: a bot learns nothing from the difference.
    return Response.json({ ok: true }, { headers: NO_STORE });
  }
  if (check.kind === "limited") return tooManyRequestsResponse(check.retryAfterSeconds);

  // Upload budget: counted only when a file part is present, before any validation or store call.
  if (form.getAll("cv").some((part) => typeof part !== "string")) {
    const upload = await checkRateLimit({ key: `form:careers-upload:ip:${extractIp(request)}`, ...UPLOAD_LIMIT });
    if (!upload.allowed) return tooManyRequestsResponse(upload.retryAfterSeconds);
  }

  const parsed = careerApplicationFieldsSchema.safeParse({
    name: text(form, "name"),
    email: text(form, "email"),
    phone: text(form, "phone"),
    qualification: text(form, "qualification"),
    consent: text(form, "consent"),
  });
  const errors: Record<string, string> = parsed.success ? {} : fieldErrors(parsed.error);

  const files = form.getAll("cv").filter((part): part is File => typeof part !== "string");
  let cvBytes: Uint8Array | null = null;
  if (files.length === 0) {
    errors.cv = careersCopy.fieldErrors.cv.missing;
  } else if (files.length > 1) {
    errors.cv = careersCopy.fieldErrors.cv.many;
  } else {
    cvBytes = new Uint8Array(await files[0].arrayBuffer());
    const failure = verifyPdfBytes(cvBytes);
    if (failure) errors.cv = CV_MESSAGES[failure];
  }

  if (!parsed.success || cvBytes === null || errors.cv) return validationResponse(errors);

  try {
    await createCareerApplication(parsed.data, cvBytes);
  } catch (error) {
    // Refused before any file was written: same body whichever field matched.
    if (error instanceof RecentApplicationError) return alreadyAppliedResponse(error.reapplyFrom);
    if (error instanceof LockBusyError || error instanceof StaleUploadError) return tryAgainResponse();
    if (error instanceof DocumentStoreUnavailableError) return storeUnavailableResponse();
    return unavailableResponse();
  }

  // Housekeeping after the response is sent; it never affects it (retention.ts catches and logs).
  after(() => maybeSweepCareers());
  return Response.json({ ok: true }, { headers: NO_STORE });
}
