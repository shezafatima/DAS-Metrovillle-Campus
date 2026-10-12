import { describe, expect, it } from "vitest";
import { parseInstagramAddress, resolveVideo } from "./embed";

describe("parseInstagramAddress", () => {
  it("accepts posts, reels and tv with or without slash/query", () => {
    expect(parseInstagramAddress("https://www.instagram.com/p/ABC123xyz/")).toEqual({ kind: "p", code: "ABC123xyz" });
    expect(parseInstagramAddress("https://instagram.com/reel/ABC123xyz")).toEqual({ kind: "reel", code: "ABC123xyz" });
    expect(parseInstagramAddress("https://www.instagram.com/reels/ABC123xyz/?igsh=1")).toEqual({ kind: "reel", code: "ABC123xyz" });
    expect(parseInstagramAddress("https://www.instagram.com/tv/ABC123xyz")).toEqual({ kind: "p", code: "ABC123xyz" });
  });

  it("refuses look-alike hosts, credentials, profiles, bad codes and non-URLs", () => {
    for (const bad of [
      "http://evil-instagram.com/p/ABC123xyz/",
      "https://instagram.com.evil.io/p/ABC123xyz/",
      "https://user:pw@instagram.com/p/ABC123xyz/",
      "https://www.instagram.com/darearqam/",
      "https://www.instagram.com/p/abc/",
      "https://www.instagram.com/p/ab.cde/",
      "not a url",
      "",
    ]) {
      expect(parseInstagramAddress(bad), bad).toBeNull();
    }
  });
});

describe("resolveVideo", () => {
  const yt = "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0";

  it("builds the privacy-enhanced YouTube embed for every accepted form", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
    ]) {
      expect(resolveVideo({ provider: "youtube", url })).toEqual({ provider: "youtube", embedUrl: yt });
    }
  });

  it("builds the Instagram embed page URL", () => {
    expect(resolveVideo({ provider: "instagram", url: "https://www.instagram.com/p/ABC123xyz/" })).toEqual({
      provider: "instagram",
      embedUrl: "https://www.instagram.com/p/ABC123xyz/embed/",
    });
    expect(resolveVideo({ provider: "instagram", url: "https://www.instagram.com/reels/ABC123xyz" })?.embedUrl).toBe(
      "https://www.instagram.com/reel/ABC123xyz/embed/",
    );
  });

  it("returns null for empty, unparsable and wrong-provider URLs", () => {
    expect(resolveVideo({ provider: "youtube", url: "" })).toBeNull();
    expect(resolveVideo({ provider: "youtube", url: "   " })).toBeNull();
    expect(resolveVideo({ provider: "youtube", url: "https://example.com/x" })).toBeNull();
    expect(resolveVideo({ provider: "instagram", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })).toBeNull();
    expect(resolveVideo({ provider: "youtube", url: "https://www.instagram.com/p/ABC123xyz/" })).toBeNull();
  });
});
