// @vitest-environment node
import { describe, expect, it } from "vitest";
import { parseYouTubeAddress } from "./youtube";

const ID = "dQw4w9WgXcQ";

describe("parseYouTubeAddress: accepted forms", () => {
  it.each([
    `https://www.youtube.com/watch?v=${ID}`,
    `youtube.com/watch?v=${ID}&t=10`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?feature=share&v=${ID}`,
    `https://youtu.be/${ID}`,
    `youtu.be/${ID}?si=abc`,
    `https://www.youtube.com/embed/${ID}`,
    `https://youtube.com/shorts/${ID}`,
    `  https://youtu.be/${ID}  `,
  ])("accepts %s", (address) => {
    expect(parseYouTubeAddress(address)).toEqual({ id: ID });
  });
});

describe("parseYouTubeAddress: refused forms", () => {
  it.each([
    "https://vimeo.com/123456",
    "https://www.youtube.com/@DASMetroville",
    "https://www.youtube.com/channel/UC1234567890",
    "https://www.youtube.com/playlist?list=PL1234567890",
    `https://youtube.com.evil.com/watch?v=${ID}`,
    `https://evil.com/watch?v=${ID}`,
    `https://notyoutube.com/watch?v=${ID}`,
    "https://www.youtube.com/watch?v=short",
    `https://www.youtube.com/watch?v=${ID}extra`,
    "javascript:alert(1)",
    "",
    "   ",
    "not a url",
  ])("refuses %j", (address) => {
    expect(parseYouTubeAddress(address)).toBeNull();
  });
});
