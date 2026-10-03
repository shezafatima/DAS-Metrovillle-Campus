/**
 * CV upload rules shared by the browser pre-check and the server (the
 * server is authoritative, Constitution V: the file's real content is
 * checked, never just its name or reported type).
 *
 * The limit is 4 MiB, below Vercel's 4.5 MB function request cap, so the
 * file can pass through the server, be checked, and only then be stored
 * (ADR-0007).
 */
export const CV_MAX_BYTES = 4 * 1024 * 1024;
export const CV_MAX_LABEL = "4 MB";
/** The whole request: the CV plus the other fields and multipart framing. */
export const CAREERS_BODY_MAX_BYTES = CV_MAX_BYTES + 64 * 1024;

export type CvFailure = "empty" | "too_large" | "not_pdf";

const PDF_HEADER = [0x25, 0x50, 0x44, 0x46, 0x2d]; // "%PDF-"
const EOF_MARKER = "%%EOF";
const EOF_SEARCH_BYTES = 1024;

function hasPdfHeader(bytes: Uint8Array): boolean {
  return bytes.length >= PDF_HEADER.length && PDF_HEADER.every((byte, index) => bytes[index] === byte);
}

/**
 * Server check on the uploaded bytes: size, the `%PDF-` header and a
 * `%%EOF` trailer in the last 1,024 bytes. `null` when acceptable.
 */
export function verifyPdfBytes(bytes: Uint8Array): CvFailure | null {
  if (bytes.byteLength === 0) return "empty";
  if (bytes.byteLength > CV_MAX_BYTES) return "too_large";
  if (!hasPdfHeader(bytes)) return "not_pdf";
  const tail = bytes.subarray(Math.max(0, bytes.length - EOF_SEARCH_BYTES));
  if (!Buffer.from(tail).toString("latin1").includes(EOF_MARKER)) return "not_pdf";
  return null;
}

function readHead(file: File, length: number): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  if (typeof slice.arrayBuffer === "function") {
    return slice.arrayBuffer().then((buffer) => new Uint8Array(buffer));
  }
  // Older browsers and some test environments have no Blob.arrayBuffer().
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Browser pre-check so the visitor gets an immediate, specific message: size
 * first (an oversized file is "too large" whatever its bytes), then the
 * leading bytes. The server repeats and extends these checks.
 */
export async function precheckCv(file: File): Promise<CvFailure | null> {
  if (file.size === 0) return "empty";
  if (file.size > CV_MAX_BYTES) return "too_large";
  if (!hasPdfHeader(await readHead(file, PDF_HEADER.length))) return "not_pdf";
  return null;
}
