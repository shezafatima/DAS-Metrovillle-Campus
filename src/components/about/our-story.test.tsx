import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ourStory } from "@/content/about";
import { OurStorySection } from "./our-story";

describe("OurStorySection", () => {
  it("renders heading, subheading and 3 paragraphs, with no Urdu", () => {
    const { container } = render(<OurStorySection value={ourStory} background="surface" />);
    expect(container.querySelector("h2")?.textContent).toBe("Our Story");
    expect(container.textContent).toContain(ourStory.subheading);
    expect(container.querySelectorAll("p").length).toBeGreaterThanOrEqual(3);
    expect(container.querySelector("[lang='ur']")).toBeNull();
  });

  it("shows the emblem as decorative in an aspect-about-story panel when there is no photo", () => {
    const { container } = render(<OurStorySection value={{ ...ourStory, image: null }} background="surface" />);
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.parentElement?.className).toContain("aspect-about-story");
  });

  it("puts one decorative icon beside each of the three paragraphs and leaves the text as it was", () => {
    const { container } = render(<OurStorySection value={ourStory} background="surface" />);
    expect(container.querySelectorAll("svg[aria-hidden='true']")).toHaveLength(3);
    const paragraphs = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(paragraphs.slice(-3).join("\n\n")).toBe(ourStory.body);
  });

  it("describes the real photo with alt text", () => {
    const { container } = render(<OurStorySection value={ourStory} background="surface" />);
    expect(ourStory.imageAlt).toBeTruthy();
    expect(container.querySelector("img")?.getAttribute("alt")).toBe(ourStory.imageAlt);
  });
});
