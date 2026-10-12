import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cookieGet = vi.fn();
const cookiesMock = vi.fn(async () => ({ get: cookieGet }));
let freshReads = true;

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: () => cookiesMock() }));
vi.mock("@/lib/e2e-fresh-reads", () => ({ freshReadsForTests: () => freshReads }));

import { placeholdersAllowed } from "./content-mode";

describe("placeholdersAllowed", () => {
  beforeEach(() => {
    cookieGet.mockReset();
    cookiesMock.mockClear();
    freshReads = true;
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is true in development without the cookie", async () => {
    vi.stubEnv("NODE_ENV", "development");
    cookieGet.mockReturnValue(undefined);
    expect(await placeholdersAllowed()).toBe(true);
  });

  it("is false in development when the production cookie is set", async () => {
    vi.stubEnv("NODE_ENV", "development");
    cookieGet.mockReturnValue({ value: "1" });
    expect(await placeholdersAllowed()).toBe(false);
  });

  it("is false in production and never reads cookies", async () => {
    vi.stubEnv("NODE_ENV", "production");
    freshReads = false;
    expect(await placeholdersAllowed()).toBe(false);
    expect(cookiesMock).not.toHaveBeenCalled();
  });

  it("does not read cookies when the guard is off", async () => {
    vi.stubEnv("NODE_ENV", "development");
    freshReads = false;
    expect(await placeholdersAllowed()).toBe(true);
    expect(cookiesMock).not.toHaveBeenCalled();
  });
});
