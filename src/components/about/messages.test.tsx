import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { messagesContent } from "@/content/about";
import { MessagesSection } from "./messages";

describe("MessagesSection", () => {
  it("renders one article per message, in full, with no toggle", () => {
    const { container } = render(<MessagesSection value={messagesContent} background="surface" />);
    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(3);
    articles.forEach((a, i) => {
      const m = messagesContent.messages[i];
      expect(a.querySelector("h3")?.textContent).toBe(m.name);
      expect(a.textContent).toContain(m.designation);
      expect(a.textContent).toContain(m.body);
    });
    expect(container.querySelector("button")).toBeNull();
  });

  it("alternates the photo side and shows a placeholder when there is no photo", () => {
    const { container } = render(<MessagesSection value={messagesContent} background="surface" />);
    const sides = [...container.querySelectorAll("article")].map((a) => a.getAttribute("data-photo-side"));
    expect(sides).toEqual(["start", "end", "start"]);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThanOrEqual(3);
  });

  it("marks a name in Urdu script as lang=ur dir=rtl", () => {
    const value = { ...messagesContent, messages: [{ ...messagesContent.messages[0], name: "فائزہ ذیشان" }] };
    const { container } = render(<MessagesSection value={value} background="surface" />);
    const h3 = container.querySelector("h3");
    expect(h3?.getAttribute("lang")).toBe("ur");
    expect(h3?.getAttribute("dir")).toBe("rtl");
  });
});
