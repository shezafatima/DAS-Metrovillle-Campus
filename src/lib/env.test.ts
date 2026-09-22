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
