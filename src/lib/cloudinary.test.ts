import { describe, expect, it, vi, beforeEach } from "vitest";

const mockConfig = vi.fn();
const mockApiSignRequest = vi.fn(() => "mock-signature");
const mockResource = vi.fn();
const mockDestroy = vi.fn();

vi.mock("cloudinary", () => ({
  v2: {
    config: mockConfig,
    utils: { api_sign_request: mockApiSignRequest },
    api: { resource: mockResource },
    uploader: { destroy: mockDestroy },
  },
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    CLOUDINARY_CLOUD_NAME: "demo-cloud",
    CLOUDINARY_API_KEY: "demo-key",
    CLOUDINARY_API_SECRET: "demo-secret",
    NEWS_COVER_VERIFY: undefined,
  }),
}));

describe("signNewsCoverUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns every documented key and never the API secret", async () => {
    const { signNewsCoverUpload } = await import("./cloudinary");
    const payload = signNewsCoverUpload();
    expect(payload).toMatchObject({
      cloudName: "demo-cloud",
      apiKey: "demo-key",
      folder: "news/covers",
      allowedFormats: "jpg,png,webp",
      transformation: "c_limit,w_2400,h_2400",
      maxBytes: 5 * 1024 * 1024,
    });
    expect(typeof payload.timestamp).toBe("number");
    expect(typeof payload.signature).toBe("string");
    expect(JSON.stringify(payload)).not.toContain("demo-secret");
  });

  it("signs exactly {timestamp, folder, allowed_formats, transformation}", async () => {
    const { signNewsCoverUpload } = await import("./cloudinary");
    signNewsCoverUpload();
    expect(mockApiSignRequest).toHaveBeenCalledWith(
      {
        timestamp: expect.any(Number),
        folder: "news/covers",
        allowed_formats: "jpg,png,webp",
        transformation: "c_limit,w_2400,h_2400",
      },
      "demo-secret",
    );
  });
});

describe("verifyNewsCover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns ok for a valid resource under the covers folder", async () => {
    mockResource.mockResolvedValue({
      bytes: 1024,
      format: "jpg",
      public_id: "news/covers/abc",
    });
    const { verifyNewsCover } = await import("./cloudinary");
    expect(await verifyNewsCover("news/covers/abc")).toEqual({ ok: true });
  });

  it("rejects a resource over 5 MB as too_large", async () => {
    mockResource.mockResolvedValue({
      bytes: 6 * 1024 * 1024,
      format: "jpg",
      public_id: "news/covers/abc",
    });
    const { verifyNewsCover } = await import("./cloudinary");
    expect(await verifyNewsCover("news/covers/abc")).toEqual({ ok: false, reason: "too_large" });
  });

  it("rejects an unsupported format as bad_format", async () => {
    mockResource.mockResolvedValue({
      bytes: 1024,
      format: "gif",
      public_id: "news/covers/abc",
    });
    const { verifyNewsCover } = await import("./cloudinary");
    expect(await verifyNewsCover("news/covers/abc")).toEqual({ ok: false, reason: "bad_format" });
  });

  it("rejects a public id outside the covers folder as wrong_folder", async () => {
    const { verifyNewsCover } = await import("./cloudinary");
    expect(await verifyNewsCover("other/x")).toEqual({ ok: false, reason: "wrong_folder" });
    expect(mockResource).not.toHaveBeenCalled();
  });

  it("maps a thrown API error to unavailable", async () => {
    mockResource.mockRejectedValue(new Error("network down"));
    const { verifyNewsCover } = await import("./cloudinary");
    expect(await verifyNewsCover("news/covers/abc")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("settings image folders (005)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("signs for the requested settings folder and nothing else", async () => {
    const { signImageUpload, SETTINGS_HERO_FOLDER, SETTINGS_GALLERY_FOLDER } = await import("./cloudinary");
    expect(signImageUpload(SETTINGS_HERO_FOLDER).folder).toBe("settings/hero");
    expect(signImageUpload(SETTINGS_GALLERY_FOLDER).folder).toBe("settings/gallery");
    expect(mockApiSignRequest).toHaveBeenLastCalledWith(
      expect.objectContaining({ folder: "settings/gallery", allowed_formats: "jpg,png,webp" }),
      "demo-secret",
    );
  });

  it("accepts an image in its own folder and refuses one from another folder", async () => {
    mockResource.mockResolvedValue({ bytes: 1024, format: "png", public_id: "settings/hero/abc" });
    const { verifyUploadedImage } = await import("./cloudinary");
    expect(await verifyUploadedImage("settings/hero/abc", "settings/hero")).toEqual({ ok: true });
    expect(await verifyUploadedImage("settings/hero/abc", "settings/gallery")).toEqual({
      ok: false,
      reason: "wrong_folder",
    });
    expect(await verifyUploadedImage("news/covers/abc", "settings/hero")).toEqual({
      ok: false,
      reason: "wrong_folder",
    });
  });

  it("deleteUploadedImage destroys the asset and never throws", async () => {
    mockDestroy.mockResolvedValueOnce({ result: "ok" });
    const { deleteUploadedImage } = await import("./cloudinary");
    await deleteUploadedImage("settings/hero/abc");
    expect(mockDestroy).toHaveBeenCalledWith("settings/hero/abc");
    mockDestroy.mockRejectedValueOnce(new Error("boom"));
    await expect(deleteUploadedImage("settings/hero/abc")).resolves.toBeUndefined();
  });
});
