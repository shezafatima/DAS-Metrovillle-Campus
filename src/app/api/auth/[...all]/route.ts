import { getAuth } from "@/lib/auth";

// Equivalent to toNextJsHandler(auth), but resolved lazily per request
// since the auth instance is now built asynchronously behind getAuth()
// rather than available synchronously at module load (see
// src/lib/auth.ts). auth.handler is exactly what toNextJsHandler wires
// GET/POST/etc to internally.
async function handleRequest(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export const GET = handleRequest;
export const POST = handleRequest;
