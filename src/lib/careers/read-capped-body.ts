/**
 * Reads a request body without ever holding more than `max` bytes, so an
 * oversized or chunked upload with no Content-Length is stopped early
 * (contracts/public-careers-api.md step 1).
 */
export async function readCappedBody(request: Request, max: number): Promise<Uint8Array | "too_large"> {
  if (!request.body) return new Uint8Array(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      // Stop reading but do not cancel the stream: cancelling can reset the
      // connection before the 413 reaches the client, and the server
      // discards the unread remainder of the request once it has responded.
      reader.releaseLock();
      return "too_large";
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/** Parses already-read multipart bytes. Throws on a malformed body. */
export async function formDataFrom(bytes: Uint8Array, contentType: string): Promise<FormData> {
  return new Response(bytes as unknown as BodyInit, { headers: { "content-type": contentType } }).formData();
}
