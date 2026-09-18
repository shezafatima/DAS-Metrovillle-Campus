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
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    const env = getEnv();
    cache.promise = mongoose
      .connect(env.MONGODB_URI, {
        dbName: env.MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => m);
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    // Allow a subsequent call to retry instead of caching a rejected promise forever.
    cache.promise = null;
    throw err;
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
