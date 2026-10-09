// @vitest-environment node
import { describe, expect, it } from "vitest";
import { IMAGE_MAX_BYTES, hasImageSignature, precheckImage } from "./image-limits";

const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

function file(bytes: number[], name: string, type: string, padTo = 0): File {
  const data = new Uint8Array(Math.max(bytes.length, padTo));
  data.set(bytes);
  return new File([data], name, { type });
}

describe("precheckImage", () => {
  it("accepts JPG, PNG and WebP with matching content", async () => {
    expect(await precheckImage(file(JPEG, "a.jpg", "image/jpeg"))).toBeNull();
    expect(await precheckImage(file(PNG, "a.png", "image/png"))).toBeNull();
    expect(await precheckImage(file(WEBP, "a.webp", "image/webp"))).toBeNull();
  });

  it("refuses other declared types (GIF, SVG, HEIC, video, PDF)", async () => {
    expect(await precheckImage(file(GIF, "a.gif", "image/gif"))).toBe("bad_format");
    expect(await precheckImage(file([0x3c, 0x73, 0x76, 0x67], "a.svg", "image/svg+xml"))).toBe("bad_format");
    expect(await precheckImage(file(JPEG, "a.heic", "image/heic"))).toBe("bad_format");
    expect(await precheckImage(file(JPEG, "a.mp4", "video/mp4"))).toBe("bad_format");
    expect(await precheckImage(file(PDF, "a.pdf", "application/pdf"))).toBe("bad_format");
  });

  it("refuses a PDF's bytes named photo.jpg with type image/jpeg", async () => {
    expect(await precheckImage(file(PDF, "photo.jpg", "image/jpeg"))).toBe("bad_format");
  });

  it("refuses a file over 5 MB, and accepts exactly 5 MB", async () => {
    expect(await precheckImage(file(JPEG, "big.jpg", "image/jpeg", IMAGE_MAX_BYTES + 1))).toBe("too_large");
    expect(await precheckImage(file(JPEG, "ok.jpg", "image/jpeg", IMAGE_MAX_BYTES))).toBeNull();
  });

  it("reports an oversized file as too large whatever its bytes are", async () => {
    expect(await precheckImage(file([1], "big.jpg", "image/jpeg", IMAGE_MAX_BYTES + 1))).toBe("too_large");
  });
});

describe("hasImageSignature", () => {
  it("is false for short or empty input", () => {
    expect(hasImageSignature(new Uint8Array([]))).toBe(false);
    expect(hasImageSignature(new Uint8Array([0xff, 0xd8]))).toBe(false);
  });
});
