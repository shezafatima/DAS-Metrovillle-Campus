import { z } from "zod";

/**
 * Server-side application environment. Every value here is required for
 * the app to run at all — a missing value fails startup with a message
 * naming exactly which variable is missing (FR-033), never a silent
 * fallback to a built-in default credential or connection.
 */
const envSchema = z.object({
  MONGODB_URI: z.string().trim().min(1, "MONGODB_URI is required"),
  BETTER_AUTH_SECRET: z
    .string()
    .trim()
    .min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),
  BETTER_AUTH_URL: z.url("BETTER_AUTH_URL must be a valid URL"),
  // .env.local ships this key present-but-empty ("MONGODB_DB_NAME=") when
  // unset, so an empty/whitespace-only value must fall back to the
  // default exactly like a genuinely missing key — z.optional().default()
  // alone only applies the default to `undefined`, not "".
  MONGODB_DB_NAME: z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : "dar_e_arqam";
    }),
  // Cover-image uploads (003 news): Cloudinary account the admin uploads
  // to. Only URLs/ids are ever stored — see src/lib/cloudinary.ts.
  CLOUDINARY_CLOUD_NAME: z.string().trim().min(1, "CLOUDINARY_CLOUD_NAME is required"),
  CLOUDINARY_API_KEY: z.string().trim().min(1, "CLOUDINARY_API_KEY is required"),
  CLOUDINARY_API_SECRET: z.string().trim().min(1, "CLOUDINARY_API_SECRET is required"),
  // Test-only escape hatch (sp.analyze I2): lets Playwright specs stub the
  // Cloudinary upload without a live account while still exercising the
  // real save path. Ignored outside test runs — see verifyNewsCover().
  // A hosting platform can set an unconfigured var to "" rather than
  // leaving it truly unset (the same reason MONGODB_DB_NAME above
  // transforms blank to its default) — z.literal(...).optional() only
  // tolerates undefined, so "" would otherwise fail parsing in production.
  NEWS_COVER_VERIFY: z
    .string()
    .optional()
    .transform((value) => (value?.trim() === "skip" ? ("skip" as const) : undefined)),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Env consumed only by scripts/seed-admin.ts — kept separate from
 * envSchema so the running app never has to know about admin
 * credentials, and so ADMIN_PASSWORD's 12-character minimum is
 * enforced with a friendly message before any database connection is
 * attempted (FR-004, FR-005).
 */
const seedEnvSchema = z.object({
  ADMIN_EMAIL: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("ADMIN_EMAIL is not a valid email address")),
  ADMIN_PASSWORD: z
    .string()
    .min(12, "ADMIN_PASSWORD must be at least 12 characters"),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;

/**
 * Required env var names, in the order we check them, so the first
 * missing one is reported deterministically rather than depending on
 * Zod's internal field iteration order.
 */
const REQUIRED_ENV_KEYS = [
  "MONGODB_URI",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

const REQUIRED_SEED_ENV_KEYS = ["ADMIN_EMAIL", "ADMIN_PASSWORD"] as const;

function assertPresent(keys: readonly string[]): void {
  for (const key of keys) {
    const value = process.env[key];
    if (value === undefined || value.trim() === "") {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}

let cachedEnv: Env | undefined;
let cachedSeedEnv: SeedEnv | undefined;

/**
 * Parses and validates process.env once, caching the result. Throws
 * `Missing required environment variable: <NAME>` for the first unset
 * value, or the schema's own message for an invalid one (e.g. a secret
 * that's too short). Never returns a partially-valid value.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;
  assertPresent(REQUIRED_ENV_KEYS);
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid environment configuration");
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}

/** Same contract as getEnv(), for the admin-seed-only variables. */
export function getSeedEnv(): SeedEnv {
  if (cachedSeedEnv) return cachedSeedEnv;
  assertPresent(REQUIRED_SEED_ENV_KEYS);
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid environment configuration");
  }
  cachedSeedEnv = parsed.data;
  return cachedSeedEnv;
}

/** Test-only: clears the cache so tests can re-parse process.env. */
export function __resetEnvCacheForTests(): void {
  cachedEnv = undefined;
  cachedSeedEnv = undefined;
}
