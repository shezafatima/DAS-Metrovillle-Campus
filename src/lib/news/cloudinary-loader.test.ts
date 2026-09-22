import { describe, expect, it } from "vitest";
import { cloudinaryLoader, ogImageUrl } from "./cloudinary-loader";

const SRC = "https://res.cloudinary.com/demo/image/upload/v1700000000/news/covers/abc.jpg";

describe("cloudinaryLoader", () => {
  it("inserts f_auto,q_auto,c_limit,w_<width> right after /image/upload/", () => {
    expect(cloudinaryLoader({ src: SRC, width: 480 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,c_limit,w_480/v1700000000/news/covers/abc.jpg",
    );
  });

  it("preserves the existing version segment", () => {
    const result = cloudinaryLoader({ src: SRC, width: 800 });
    expect(result).toContain("/v1700000000/news/covers/abc.jpg");
  });

  it("passes through a non-Cloudinary URL unchanged", () => {
    const other = "https://example.com/image.jpg";
    expect(cloudinaryLoader({ src: other, width: 480 })).toBe(other);
  });
});

describe("ogImageUrl", () => {
  it("inserts a fixed 1200x630 fill crop", () => {
    expect(ogImageUrl(SRC)).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_630,f_auto,q_auto/v1700000000/news/covers/abc.jpg",
    );
  });

  it("passes through a non-Cloudinary URL unchanged", () => {
    const other = "https://example.com/image.jpg";
    expect(ogImageUrl(other)).toBe(other);
  });
});
