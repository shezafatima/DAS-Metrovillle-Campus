import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { getEnv, getSeedEnv, __resetEnvCacheForTests } from "./env";

const BASE_ENV = {
  MONGODB_URI: "mongodb+srv://user:pass@cluster.mongodb.net",
  BETTER_AUTH_SECRET: "a".repeat(32),
  BETTER_AUTH_URL: "http://localhost:3000",
  CLOUDINARY_CLOUD_NAME: "demo-cloud",
  CLOUDINARY_API_KEY: "123456789012345",
  CLOUDINARY_API_SECRET: "s".repeat(24),
};

describe("getEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetEnvCacheForTests();
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    __resetEnvCacheForTests();
  });

  it("throws naming the missing variable when MONGODB_URI is unset", () => {
    Object.assign(process.env, BASE_ENV, { MONGODB_URI: "" });
    expect(() => getEnv()).toThrow("Missing required environment variable: MONGODB_URI");
  });

  it("throws when BETTER_AUTH_SECRET is too short", () => {
    Object.assign(process.env, BASE_ENV, { BETTER_AUTH_SECRET: "too-short" });
    expect(() => getEnv()).toThrow(/BETTER_AUTH_SECRET must be at least 32 characters/);
  });

  it("defaults MONGODB_DB_NAME to dar_e_arqam when unset", () => {
    Object.assign(process.env, BASE_ENV);
    delete process.env.MONGODB_DB_NAME;
    expect(getEnv().MONGODB_DB_NAME).toBe("dar_e_arqam");
  });

  it("defaults MONGODB_DB_NAME to dar_e_arqam when present but empty (regression: .env.local ships this key as 'KEY=')", () => {
    Object.assign(process.env, BASE_ENV, { MONGODB_DB_NAME: "" });
    expect(getEnv().MONGODB_DB_NAME).toBe("dar_e_arqam");
  });

  it("uses an explicit MONGODB_DB_NAME when one is set", () => {
    Object.assign(process.env, BASE_ENV, { MONGODB_DB_NAME: "custom_db" });
    expect(getEnv().MONGODB_DB_NAME).toBe("custom_db");
  });

  it("throws naming the missing variable when CLOUDINARY_API_SECRET is unset", () => {
    Object.assign(process.env, BASE_ENV, { CLOUDINARY_API_SECRET: "" });
    expect(() => getEnv()).toThrow(
      "Missing required environment variable: CLOUDINARY_API_SECRET",
    );
  });

  it("parses successfully with all three Cloudinary variables present", () => {
    Object.assign(process.env, BASE_ENV);
    const env = getEnv();
    expect(env.CLOUDINARY_CLOUD_NAME).toBe("demo-cloud");
    expect(env.CLOUDINARY_API_KEY).toBe("123456789012345");
    expect(env.CLOUDINARY_API_SECRET).toBe("s".repeat(24));
  });
});

describe("getEnv — private document store (012 careers)", () => {
  const originalEnv = { ...process.env };
  const STORE_KEYS = [
    "DOCUMENT_STORE_DRIVER",
    "DOCUMENT_STORE_LOCAL_DIR",
    "BLOB_STORE_ID",
    "BLOB_READ_WRITE_TOKEN",
    "CAREERS_RETENTION_MONTHS",
  ];

  function setEnv(extra: Record<string, string> = {}) {
    for (const key of STORE_KEYS) delete process.env[key];
    Object.assign(process.env, BASE_ENV, extra);
  }

  beforeEach(() => {
    __resetEnvCacheForTests();
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    __resetEnvCacheForTests();
  });

  it("defaults to the local driver, the default directory and 12 months outside production", () => {
    setEnv({ NODE_ENV: "development" });
    const env = getEnv();
    expect(env.DOCUMENT_STORE_DRIVER).toBe("local");
    expect(env.DOCUMENT_STORE_LOCAL_DIR).toBe(".data/documents");
    expect(env.CAREERS_RETENTION_MONTHS).toBe(12);
  });

  it("treats blank store variables like unset", () => {
    setEnv({
      NODE_ENV: "development",
      DOCUMENT_STORE_DRIVER: "  ",
      DOCUMENT_STORE_LOCAL_DIR: "",
      BLOB_STORE_ID: " ",
      BLOB_READ_WRITE_TOKEN: "",
      CAREERS_RETENTION_MONTHS: "",
    });
    const env = getEnv();
    expect(env.DOCUMENT_STORE_DRIVER).toBe("local");
    expect(env.BLOB_STORE_ID).toBeUndefined();
    expect(env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
    expect(env.CAREERS_RETENTION_MONTHS).toBe(12);
  });

  it("defaults to vercel-blob in production and then requires credentials, naming the variable", () => {
    setEnv({ NODE_ENV: "production" });
    expect(() => getEnv()).toThrow("Missing required environment variable: BLOB_READ_WRITE_TOKEN");
  });

  it("accepts vercel-blob in production with a token, or with a store id", () => {
    setEnv({ NODE_ENV: "production", BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_x" });
    expect(getEnv().DOCUMENT_STORE_DRIVER).toBe("vercel-blob");
    __resetEnvCacheForTests();
    setEnv({ NODE_ENV: "production", DOCUMENT_STORE_DRIVER: "vercel-blob", BLOB_STORE_ID: "store_abc" });
    expect(getEnv().BLOB_STORE_ID).toBe("store_abc");
  });

  it("refuses the local driver in production", () => {
    setEnv({ NODE_ENV: "production", DOCUMENT_STORE_DRIVER: "local", BLOB_READ_WRITE_TOKEN: "x" });
    expect(() => getEnv()).toThrow("DOCUMENT_STORE_DRIVER=local is not allowed in production");
  });

  it("rejects an unknown driver", () => {
    setEnv({ NODE_ENV: "development", DOCUMENT_STORE_DRIVER: "s3" });
    expect(() => getEnv()).toThrow("DOCUMENT_STORE_DRIVER must be vercel-blob or local");
  });

  it("does not require Blob credentials outside production", () => {
    setEnv({ NODE_ENV: "test", DOCUMENT_STORE_DRIVER: "vercel-blob" });
    expect(getEnv().DOCUMENT_STORE_DRIVER).toBe("vercel-blob");
  });

  it.each([
    ["0", /from 1 to 120/],
    ["121", /from 1 to 120/],
    ["six", /whole number/],
    ["1.5", /whole number/],
  ])("rejects CAREERS_RETENTION_MONTHS=%s", (value, message) => {
    setEnv({ NODE_ENV: "development", CAREERS_RETENTION_MONTHS: value });
    expect(() => getEnv()).toThrow(message);
  });

  it("accepts the bounds 1 and 120", () => {
    setEnv({ NODE_ENV: "development", CAREERS_RETENTION_MONTHS: "1" });
    expect(getEnv().CAREERS_RETENTION_MONTHS).toBe(1);
    __resetEnvCacheForTests();
    setEnv({ NODE_ENV: "development", CAREERS_RETENTION_MONTHS: "120" });
    expect(getEnv().CAREERS_RETENTION_MONTHS).toBe(120);
  });
});

describe("getSeedEnv", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    __resetEnvCacheForTests();
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    __resetEnvCacheForTests();
  });

  it("throws naming ADMIN_EMAIL when unset", () => {
    process.env.ADMIN_PASSWORD = "correct-horse-battery";
    expect(() => getSeedEnv()).toThrow("Missing required environment variable: ADMIN_EMAIL");
  });

  it("throws with the exact minimum-length message for an 11-character password", () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.ADMIN_PASSWORD = "1234567890a"; // 11 chars
    expect(() => getSeedEnv()).toThrow("ADMIN_PASSWORD must be at least 12 characters");
  });

  it("trims and lower-cases ADMIN_EMAIL", () => {
    process.env.ADMIN_EMAIL = " Admin@Example.COM ";
    process.env.ADMIN_PASSWORD = "correct-horse-battery";
    expect(getSeedEnv().ADMIN_EMAIL).toBe("admin@example.com");
  });

  it("throws for an invalid email shape", () => {
    process.env.ADMIN_EMAIL = "not-an-email";
    process.env.ADMIN_PASSWORD = "correct-horse-battery";
    expect(() => getSeedEnv()).toThrow("ADMIN_EMAIL is not a valid email address");
  });
});
