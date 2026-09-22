import mongoose from "mongoose";
import { getEnv } from "@/lib/env";

/**
 * One cached Mongoose connection, reused across requests and across dev
 * HMR reloads (docs/architecture.md "Database and auth"). Better Auth's
 * Mongo adapter is handed the same underlying MongoClient via
 * getMongoClient() below, so the app never opens a second driver
 * connection alongside Mongoose's.
 */

type CachedConnection = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __mongooseCache: CachedConnection | undefined;
}

const cache: CachedConnection = global.__mongooseCache ?? { conn: null, promise: null };
if (!global.__mongooseCache) {
  global.__mongooseCache = cache;
}

export async function connectDb(): Promise<typeof mongoose> {
  // readyState 1 = connected, 2 = connecting — both are safe to reuse.
  // A cached `conn` can still be 0 (disconnected) or 3 (disconnecting) if
  // something outside this module called mongoose.disconnect() on the
  // same connection (e.g. a Vitest suite's own afterAll cleanup when
  // multiple test files share this cache — see vitest.config.ts's
  // fileParallelism comment). Trusting a stale conn here surfaces as
  // "Client must be connected" / "buffering timed out" errors in whatever
  // called us, well after the real cause; treat it as no connection and
  // fall through to reconnect instead.
  if (cache.conn && cache.conn.connection.readyState !== 0 && cache.conn.connection.readyState !== 3) {
    return cache.conn;
  }
  if (cache.conn) {
    // Stale: the promise (if any) already resolved to this same dead
    // connection — awaiting it again would just hand it back unchanged.
    cache.conn = null;
    cache.promise = null;
  }

  if (!cache.promise) {
    const env = getEnv();
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 15000,
      })
      .then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Allow a subsequent call to retry instead of caching a rejected promise forever.
    cache.promise = null;
    // Log the full error (it carries non-plain internals — TopologyDescription
    // with Maps/Sets, connection details) server-side only, then re-throw a
    // clean, plain Error. The raw driver error can't cross the server→client
    // boundary React uses for error.tsx's props ("Only plain objects... can
    // be passed to Client Components") — letting it propagate as-is turns a
    // graceful "service unavailable" page into an unhandled 500.
    console.error("[db] connection failed:", err);
    throw new Error("Database connection failed");
  }

  return cache.conn;
}

/**
 * The native MongoClient behind the cached Mongoose connection, handed to
 * Better Auth's mongodbAdapter so it shares one driver instance with
 * Mongoose instead of opening its own (docs/architecture.md).
 */
export function getMongoClient() {
  return mongoose.connection.getClient();
}
